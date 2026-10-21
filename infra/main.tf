terraform {
  required_version = ">= 1.5"

  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 4.0"
    }
  }

  # El path real se pasa con -backend-config en el init (ver README.md de esta
  # carpeta): el estado vive en $HOME/tfstate/, nunca dentro del repo.
  backend "local" {}
}

provider "docker" {} # habla con el Docker local (daemon del TP2)

# --- La red y el volumen de PREPROD: no existen hasta que esto se aplica ---

resource "docker_network" "app" {
  name = "ingsoft3-preprod"
}

resource "docker_volume" "db_data" {
  name = "ingsoft3-preprod-db-data"
}

# --- La base de PREPROD ---

resource "docker_image" "postgres" {
  name         = "postgres:14-alpine" # misma versión que docker-compose.yml de desarrollo
  keep_locally = true                 # no borrar la imagen al destroy: puede estar en uso por otro contenedor local (ver decisiones.md)
}

resource "docker_container" "db" {
  name  = "ingsoft3-preprod-db"
  image = docker_image.postgres.image_id

  env = [
    "POSTGRES_DB=${var.db_schema}",
    "POSTGRES_USER=${var.db_user}",
    "POSTGRES_PASSWORD=${var.db_password}",
  ]

  networks_advanced {
    name = docker_network.app.name
  }

  volumes {
    volume_name    = docker_volume.db_data.name
    container_path = "/var/lib/postgresql/data"
  }
}

# --- La api de PREPROD: la imagen del TP7, nunca reconstruida ---

resource "docker_image" "api" {
  name         = "ghcr.io/joseruarte2004/ingsoft3-tp01-backend:${var.image_tag}"
  platform     = "linux/amd64" # el pipeline del TP7 solo publica esta plataforma
  keep_locally = true
}

resource "docker_container" "api" {
  name    = "ingsoft3-preprod-api"
  image   = docker_image.api.image_id
  restart = "unless-stopped" # depends_on espera que el contenedor de la BD se CREE, no que postgres esté LISTO

  env = [
    "DB_HOST=${docker_container.db.name}", # nombre del contenedor = hostname en la red de Docker
    "DB_PORT=5432",
    "DB_USER=${var.db_user}",
    "DB_PASSWORD=${var.db_password}",
    "DB_SCHEMA=${var.db_schema}",
    "SESSION_SECRET=${var.session_secret}",
    "COOKIE_PARSER_SECRET=${var.cookie_parser_secret}",
    "PORT=5000",
  ]

  networks_advanced {
    name = docker_network.app.name
  }

  ports {
    internal = 5000
    external = 5090 # distinto del 5050 de docker-compose.yml de desarrollo
  }

  depends_on = [docker_container.db]
}

# --- El front de PREPROD: la imagen del TP7, apuntando a SU propia api ---

resource "docker_image" "front" {
  name         = "ghcr.io/joseruarte2004/ingsoft3-tp01-frontend:${var.image_tag}"
  platform     = "linux/amd64"
  keep_locally = true
}

resource "docker_container" "front" {
  name  = "ingsoft3-preprod-front"
  image = docker_image.front.image_id

  env = [
    "BACKEND_URL=http://${docker_container.api.name}:5000", # DERIVADA: no se copia, sale de la api de este entorno
    "DNS_RESOLVER=127.0.0.11",                              # DNS interno de Docker
  ]

  networks_advanced {
    name = docker_network.app.name
  }

  ports {
    internal = 80
    external = 3090 # distinto del 3000 de docker-compose.yml de desarrollo
  }

  depends_on = [docker_container.api]
}
