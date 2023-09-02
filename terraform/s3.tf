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