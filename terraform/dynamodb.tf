resource "aws_dynamodb_table" "published_table" {
  name         = "www.${aws_route53_zone.this.name}-published"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "ULID"
  range_key    = "DataType"

  attribute {
    name = "ULID"
    type = "S"
  }

  attribute {
    name = "DataType"
    type = "S"
  }
}

resource "aws_dynamodb_table" "archived_table" {
  name         = "www.${aws_route53_zone.this.name}-archived"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "ULID"
  range_key    = "Revision"

  attribute {
    name = "ULID"
    type = "S"
  }

  attribute {
    name = "Revision"
    type = "S"
  }
}