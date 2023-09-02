variable "username" {
  description = "Basic auth username"
}
variable "password" {
  description = "Basic auth password"
}

# Lambda レイヤー aws-sdk の zip 作成
data "archive_file" "lambda_layer_aws_sdk_zip" {
  type        = "zip"
  source_dir  = "../lambda/layer/aws-sdk"
  output_path = "../dist/lambda/layer/aws-sdk.zip"
}

# Lambda レイヤー aws-sdk を登録
resource "aws_lambda_layer_version" "layer_aws_sdk" {
  layer_name          = "aws-sdk"
  compatible_runtimes = ["nodejs18.x"]
  filename            = data.archive_file.lambda_layer_aws_sdk_zip.output_path
  source_code_hash    = data.archive_file.lambda_layer_aws_sdk_zip.output_base64sha256
}

# Lambda 関数を実行する assume-role を作成する
resource "aws_iam_role" "this" {
  name = "www.${aws_route53_zone.this.name}-lambda-assume-role"

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

# Lambda 関数を実行する assume-role に Lambda を実行するために必要なポリシーをアタッチする
resource "aws_iam_role_policy_attachment" "this" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.this.name
}

# 独自のポリシーを作成し assume-role にアタッチ
resource "aws_iam_role_policy" "this" {
  name = "www.${aws_route53_zone.this.name}-lambda-custom-policy"
  role = aws_iam_role.this.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:BatchWriteItem",
        ]
        Resource = "*"
      }
    ]
  })
}

# Lambda 関数の実装（ベーシック認証）の zip 作成
data "archive_file" "lambda_basic_auth_zip" {
  type        = "zip"
  source_dir  = "../dist/lambda/basic-auth"
  output_path = "../dist/lambda/basic-auth.zip"
}

# Lambda 関数 www_pu10g_com_basic_auth を作成
resource "aws_lambda_function" "www_pu10g_com_basic_auth" {
  function_name    = "www_pu10g_com_basic_auth"
  role             = aws_iam_role.this.arn
  runtime          = "nodejs18.x"
  handler          = "basic-auth.handler"
  source_code_hash = data.archive_file.lambda_basic_auth_zip.output_base64sha256
  filename         = data.archive_file.lambda_basic_auth_zip.output_path

  environment {
    variables = {
      USERNAME = var.username
      PASSWORD = var.password
    }
  }
}

# Lambda 関数 www_pu10g_com_basic_auth を API Gateway から叩けるようにする
resource "aws_lambda_permission" "www_pu10g_com_basic_auth" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.www_pu10g_com_basic_auth.arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.this.execution_arn}/*"
}

# Lambda 関数の実装（コンテンツ DynamoDB の操作）の zip 圧縮
data "archive_file" "lambda_www_pu10g_com_dynamo_content_zip" {
  type        = "zip"
  source_dir  = "../dist/lambda/dynamo-content"
  output_path = "../dist/lambda/dynamo-content.zip"
}

# Lambda関数 www_pu10g_com_dynamo_content を作成
resource "aws_lambda_function" "www_pu10g_com_dynamo_content" {
  function_name    = "www_pu10g_com_dynamo_content"
  role             = aws_iam_role.this.arn
  runtime          = "nodejs18.x"
  handler          = "dynamo-content.handler"
  source_code_hash = data.archive_file.lambda_www_pu10g_com_dynamo_content_zip.output_base64sha256
  filename         = data.archive_file.lambda_www_pu10g_com_dynamo_content_zip.output_path
  layers = [
    aws_lambda_layer_version.layer_aws_sdk.arn
  ]
}

# Lambda 関数 www_pu10g_com_dynamo_content を API Gateway から叩けるようにする
resource "aws_lambda_permission" "www_pu10g_com_dynamo_content" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.www_pu10g_com_dynamo_content.arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.this.execution_arn}/*"
}
