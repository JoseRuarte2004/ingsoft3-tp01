variable "db_user" {
  type    = string
  default = "postgres"
}

variable "db_schema" {
  type    = string
  default = "app_preprod"
}

variable "db_password" {
  type      = string
  sensitive = true # no se imprime en logs ni en el plan; sin default, va por tfvars ignorado
}

variable "session_secret" {
  type      = string
  sensitive = true
}

variable "cookie_parser_secret" {
  type      = string
  sensitive = true
}

variable "image_tag" {
  type = string # sin default: sha-<commit> de una imagen publicada por el pipeline del TP7
}
