terraform {
  backend "s3" {}
}

# 東京リージョン（ap-northeast-1）のprovider
provider "aws" {
  region  = "ap-northeast-1"
  profile = "www.pu10g.com-terraform"
}

# CloudFrontのSSL証明書はバージニア北部リージョン（us-east-1）で管理が必要なので
provider "aws" {
  region  = "us-east-1"
  profile = "www.pu10g.com-terraform"
  alias   = "region_us_east_1"
}

# Route53
resource "aws_route53_zone" "this" {
  name = "pu10g.com"
}

# AWS Certificate Manager (ACM)
resource "aws_acm_certificate" "this" {
  domain_name               = aws_route53_zone.this.name
  subject_alternative_names = ["www.${aws_route53_zone.this.name}"]
  validation_method         = "DNS"
  # バージニア北部（us-east-1）に展開する
  provider = aws.region_us_east_1

  lifecycle {
    create_before_destroy = true
  }
}

# S3
resource "aws_s3_bucket" "www_pu10g_com" {
  bucket = "www.${aws_route53_zone.this.name}-web"
}


resource "aws_s3_bucket_ownership_controls" "www_pu10g_com" {
  bucket = aws_s3_bucket.www_pu10g_com.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "www_pu10g_com" {
  depends_on = [aws_s3_bucket_ownership_controls.www_pu10g_com]
  bucket     = aws_s3_bucket.www_pu10g_com.id
  acl        = "private"
}

resource "aws_s3_bucket_policy" "www_pu10g_com" {
  bucket = aws_s3_bucket.www_pu10g_com.id
  policy = data.aws_iam_policy_document.www_pu10g_com.json
}

data "aws_iam_policy_document" "www_pu10g_com" {
  statement {
    sid    = "Allow CloudFront"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    actions = [
      "s3:GetObject"
    ]

    resources = [
      "${aws_s3_bucket.www_pu10g_com.arn}/*"
    ]

    condition {
      test     = "StringEquals"
      variable = "aws:SourceArn"
      values   = [aws_cloudfront_distribution.this.arn]
    }
  }
}

# CloudFront
resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  default_root_object = "index.html"

  restrictions {
    geo_restriction {
      restriction_type = "whitelist"
      locations        = ["JP"]
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  origin {
    domain_name              = aws_s3_bucket.www_pu10g_com.bucket_regional_domain_name
    origin_id                = aws_s3_bucket.www_pu10g_com.id
    origin_access_control_id = aws_cloudfront_origin_access_control.this.id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = aws_s3_bucket.www_pu10g_com.id

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }
}

resource "aws_cloudfront_origin_access_control" "this" {
  name                              = aws_s3_bucket.www_pu10g_com.bucket
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Lambda
data "archive_file" "sample_zip" {
  type        = "zip"
  source_dir  = "../lambda"
  output_path = "../dist/lambda.zip"
}

resource "aws_lambda_function" "sample" {
  function_name    = "sample"
  role             = aws_iam_role.this.arn
  runtime          = "nodejs18.x"
  handler          = "sample.handler"
  source_code_hash = data.archive_file.sample_zip.output_base64sha256
  filename         = data.archive_file.sample_zip.output_path
}

resource "aws_iam_role" "this" {
  name = "lambda-blog-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = [
            "lambda.amazonaws.com",
            "apigateway.amazonaws.com"
          ]
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution_access" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.this.name
}

# Lambda 関数 sample を API Gateway から叩けるようにする
resource "aws_lambda_permission" "this" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sample.arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.this.execution_arn}/*"
}


# API Gateway の立ち上げ
resource "aws_api_gateway_rest_api" "this" {
  name = "www.${aws_route53_zone.this.name}-api"
  body = templatefile("./openapi.yml", {
    sample_arn    = aws_lambda_function.sample.invoke_arn
  })
}

# API Gateway のデプロイとして prod を用意する
resource "aws_api_gateway_deployment" "deployment" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  depends_on  = [aws_api_gateway_rest_api.this]
  stage_name  = "api"
  triggers = {
    redeployment = sha1(jsonencode(aws_api_gateway_rest_api.this))
  }
}