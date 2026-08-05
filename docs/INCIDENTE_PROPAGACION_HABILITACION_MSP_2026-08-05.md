# Incidente: propagación incorrecta de habilitación final MSP

Fecha de detección: 2026-08-05  
Proyecto Supabase: `itolluaivfoxnaohbsdk`

## Resumen

El KPI de habilitación final MSP pasó de 212 a 219 aunque el documento rector
`data/reference/ELEPEM_HABILITADOS_JUNIO_2026.pdf` contiene 212 sedes.

No se incorporaron siete habilitaciones nuevas. Un backfill normalizado propagó
la bandera `msp_final` de cualquier integrante de una agrupación hacia una fila
heredada vinculada, incluso cuando representaban direcciones físicas diferentes.
Además, algunos registros eran duplicados de sedes vigentes o históricas que ya
existían en la base.

## Registros afectados

| ID | Resolución |
|---|---|
| `MSP24-014` | Retirar habilitación; sede Palmas y Ombúes 5805 a verificar. |
| `MSP24-026` | Retirar habilitación; sede Bulevar España 2128 a verificar. |
| `MSP24-028` | Retirar habilitación; conservar como antecedente histórico de Las Olas. |
| `MSP24-151` | Retirar habilitación duplicada; conservar como antecedente del registro vigente `MSP24-005`. |
| `MSP24-196` | Retirar habilitación; conservar como antecedente histórico de Sol y Luna. |
| `MSP24-203` | Retirar habilitación; conservar como antecedente histórico del Hogar de Cardona. |
| `MSP24-205` | Retirar habilitación; conservar como antecedente histórico de José Pedro Varela. |

## Causa raíz

La construcción de banderas administrativas usaba una operación OR entre la
fila heredada y todos los integrantes de la agrupación oficial. La identidad de
una organización o un nombre parecido no prueba que cada una de sus sedes tenga
la misma habilitación.

## Corrección preventiva

Una membresía administrativa solo puede propagarse a una sede heredada cuando
coinciden la dirección normalizada y el departamento. Las discrepancias quedan
para revisión humana. La fuente original se conserva y no se transforma en una
habilitación vigente.

## Reversibilidad

- Migración: `supabase/migrations/20260805013000_correct_msp_final_june_2026.sql`.
- Rollback: `supabase/rollbacks/20260805013000_restore_incorrect_msp_final_flags.sql`.
- La migración valida los conteos 219 → 212 y no cambia la cantidad total de
  filas de `public.residenciales`.
