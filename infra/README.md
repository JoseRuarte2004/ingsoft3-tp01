# infra/ — preprod (TP8, Plan C: Terraform + provider Docker)

Entorno **nuevo** (`preprod`): red + volumen + Postgres + `api` + `front`, corriendo las
imágenes `sha-<commit>` publicadas por el pipeline del TP7. No toca QA ni PROD (viven en
Render/Neon, fuera de este archivo). Se crea y se destruye con Docker local — no pide
ninguna cuenta ni clave nueva.

## Primer uso

```bash
cd infra
terraform init -backend-config="path=$HOME/tfstate/ingsoft3-preprod.tfstate"
```

El estado vive en `$HOME/tfstate/`, nunca en este directorio: `infra/*.tfstate` queda
ignorado por el `.gitignore` de la raíz, y si viviera acá un `git clean -ffdx` (lo que corre
`actions/checkout` antes de cada checkout) se lo llevaría.

Creá `local.tfvars` (ignorado por git, no se commitea):

```hcl
db_password          = "elegí una contraseña local"
session_secret        = "elegí un valor cualquiera"
cookie_parser_secret   = "elegí un valor cualquiera"
image_tag              = "sha-<40 caracteres de un commit con imagen publicada por el TP7>"
```

## Ciclo

```bash
terraform fmt && terraform validate
terraform plan  -var-file=local.tfvars
terraform apply -var-file=local.tfvars
terraform output

curl http://localhost:5090/health      # liveness
curl http://localhost:5090/health/db   # readiness (la base real)
open http://localhost:3090             # el front, contra SU api
```

## Puertos

`5090` (api) y `3090` (front) — distintos de los `5050`/`3000` del `docker-compose.yml` de
desarrollo, para que preprod pueda convivir con él sin pisarlo.

## Vida y muerte

```bash
terraform destroy -var-file=local.tfvars   # preprod se va entero
terraform apply   -var-file=local.tfvars   # …y vuelve idéntico
```

Cuando no estés usando preprod, `destroy`. No hay cuota de nube que proteger en este plan
(todo es local), pero es la misma disciplina del riel canónico y la que se muestra en la
defensa.

> Las tres variables `db_password`/`session_secret`/`cookie_parser_secret` son locales a
> este entorno Docker — no son las de QA/PROD ni las de ninguna cuenta real.
