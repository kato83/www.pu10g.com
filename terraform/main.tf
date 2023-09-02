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

# API Gateway の立ち上げ
resource "aws_api_gateway_rest_api" "this" {
  name = "www.${aws_route53_zone.this.name}-api"
  body = templatefile("./openapi.yml", {
    www_pu10g_com_dynamo_content_arn = aws_lambda_function.www_pu10g_com_dynamo_content.invoke_arn
    www_pu10g_com_basic_auth_arn     = aws_lambda_function.www_pu10g_com_basic_auth.invoke_arn
  })
}

# API Gateway のデプロイとして api を用意する
resource "aws_api_gateway_deployment" "deployment" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  depends_on  = [aws_api_gateway_rest_api.this]
  stage_name  = "api"
  triggers = {
    redeployment = sha1(jsonencode(aws_api_gateway_rest_api.this))
  }
}

resource "aws_api_gateway_gateway_response" "test" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  status_code   = "401"
  response_type = "UNAUTHORIZED"

  response_parameters = {
    "gatewayresponse.header.WWW-Authenticate" = "'Basic'"
  }
}
