Está bastante mejor. **Ya tiene un núcleo real y demostrable**: una persona envía la comunicación, se guarda en Supabase, aparece en la bandeja del equipo, el equipo registra una revisión y después la persona puede consultar un avance. No la rediseñaría ni volvería al formulario largo de ocho etapas. Cerraría inconsistencias que todavía quedaron a mitad de camino.

## **1\. Corregir la urgencia, porque ahora todos los casos entran como “Baja”**

Este es el cambio funcional más importante. En `IntakeReportForm.tsx` todavía existe el campo `urgency`, pero no aparece en ninguna pantalla. Al enviar, la aplicación fija siempre:

preliminaryPriority: "Baja"

en la línea 352\. Eso significa que un incendio, una persona encerrada o una necesidad médica urgente ingresarían inicialmente con prioridad baja.

Lo resolvería dentro del paso **“¿Qué está pasando?”**, sin agregar una etapa nueva:

**¿Hay riesgo ahora?**

* Hay peligro inmediato o necesita atención médica urgente.  
* Necesita atención pronto, aunque no parece una emergencia.  
* No parece haber urgencia inmediata.  
* No lo sé.

Debajo pondría permanentemente:

> **En una emergencia llamá al 911, a Bomberos o a una emergencia médica. Este formulario no sustituye una respuesta inmediata.**

También movería a este bloque la pregunta **“¿Hay alguna acción que podría aumentar el riesgo?”**, porque hoy “No contactar primero…” aparece solamente para comunicaciones confidenciales o identificadas. El riesgo no depende de que la comunicación sea anónima. Esa independencia entre identidad y urgencia era uno de los criterios centrales que habíamos definido.

## **2\. Terminar de implementar bien las tres modalidades de privacidad**

La explicación mejoró mucho, pero todavía faltan las reglas que hacen que cada modalidad sea realmente distinta.

### **Anónima**

Actualmente se borran teléfono, correo y nombre al elegirla, lo cual está bien. Pero también hay que:

* borrar `reporter`, porque hoy puede quedar oculto un valor seleccionado en la modalidad anterior;  
* agregar **“Me está pasando a mí”** y **“Prefiero no decirlo”** en “¿Cómo conocés los hechos?”;  
* hacer que el servidor elimine los datos de contacto, no solamente la interfaz;  
* advertir que el relato, las fotografías y los nombres de archivo también pueden identificar indirectamente a la persona.

### **Confidencial**

Ahora puede enviarse sin teléfono ni correo porque ambos figuran como opcionales. Además, `contactMethod` comienza con el valor interno `"Sin contacto"`, aunque esa opción ni siquiera aparece en el selector.

Debe exigir:

* al menos un teléfono o correo;  
* un medio seguro de contacto;  
* horario o condición segura;  
* autorización para contactar;  
* permiso o no para dejar mensaje;  
* opcionalmente, una frase neutral que pueda usar el equipo.

El nombre o alias sí puede seguir siendo opcional.

### **Con identidad registrada**

Actualmente visualmente parece exigir nombre y contacto, pero la validación solamente comprueba que exista modalidad y relación con los hechos. Se puede continuar con nombre, teléfono y correo vacíos.

Debe exigir:

* nombre;  
* al menos un teléfono o correo;  
* medio y condición segura de contacto.

Estas reglas tienen que estar también en `app/api/intake-reports/route.ts`. Hoy el servidor acepta cualquier texto como modalidad y no aplica condiciones diferentes según la opción elegida. La recomendación anterior era precisamente: anónima sin contacto, confidencial con un contacto reservado obligatorio e identificada con nombre y contacto.

## **3\. Mostrar la explicación dentro de las tarjetas, antes de elegir**

Hoy primero aparecen únicamente:

* Anónima  
* Confidencial  
* Con identidad registrada

La explicación completa aparece después de hacer clic. Yo dejaría las tarjetas así desde el principio:

**Anónima**  
 *No doy mis datos*

**Confidencial**  
 *Doy un contacto reservado*

**Con identidad registrada**  
 *Mi identidad queda asociada a la comunicación*

Después de seleccionar, puede mantenerse el texto largo que ya está. Es un cambio visual pequeño, pero evita que la persona elija una palabra cuyo significado todavía no entiende. También cambiaría el nombre del paso de **“Contacto”** a **“Privacidad y contacto”**, porque una comunicación anónima justamente no tiene contacto. La redacción completa ya había quedado definida en el documento de trabajo.

## **4\. Marcar claramente qué es obligatorio y corregir la validación del lugar**

Todavía hay diferencias entre lo que parece obligatorio, lo que valida la pantalla y lo que después exige el servidor.

Haría visibles estas reglas:

### **Paso 1**

* **Ámbito: obligatorio.** Ya existe “No se conoce”, así que no hay razón para permitir que quede vacío.  
* Al menos una preocupación o un relato.  
* Si elige “No sé cómo clasificarlo”, relato obligatorio.  
* Urgencia o “No lo sé”: obligatorio.

### **Paso 2**

* Departamento obligatorio, incluyendo la opción “No se conoce”.  
* Al menos una referencia concreta: dirección, ciudad/localidad, nombre del residencial o una referencia específica del lugar.

Actualmente la pantalla permite continuar con una dirección y sin departamento, pero la API rechaza el envío porque exige departamento. También acepta el relato general como referencia territorial cuando se marca “No conozco la dirección exacta”. Un relato como “la tratan mal” puede terminar contando como ubicación aunque no permita localizar nada.

Agregaría un campo específico:

> **Referencia para encontrar el lugar**  
>  Esquina, comercio cercano, color de la fachada, nombre por el que se conoce o cualquier otro dato útil.

Y mostraría en todos los campos una etiqueta clara: **Necesario para continuar** u **Opcional**.

## **5\. Corregir el error del triage institucional**

Este no es solamente un detalle visual. En la bandeja existe la casilla:

> “La situación está dentro del alcance del servicio”.

Comienza desmarcada. Cuando se guarda:

* marcada \= `in_review`;  
* desmarcada \= `referred`.

Por lo tanto, **“todavía no lo evalué” se transforma automáticamente en “comunicación derivada”**. Eso puede mostrarle a la persona un avance falso.

La cambiaría por un selector de tres estados:

1. **Pendiente de determinar**  
2. **Sí, está dentro del alcance**  
3. **No, requiere orientación o derivación**

Solamente la tercera opción debería exigir organismo de destino y generar un estado de derivación. Además, cuando el equipo cambia la urgencia, hay que actualizar también `intake_reports.priority`. Actualmente la urgencia nueva queda dentro del historial, pero la insignia de la bandeja sigue mostrando la prioridad inicial. El problema y la solución de tres estados ya estaban identificados en la revisión anterior.

## **6\. Conectar realmente el mapa de ELEPEM con el formulario**

Este es un cambio bastante fácil y mejora mucho la demostración.

Ahora una persona abre la ficha de un residencial y pulsa **“Comunicar preocupación”**, pero la aplicación solamente navega al formulario. Pierde:

* identificador;  
* nombre;  
* dirección;  
* localidad;  
* departamento;  
* situación administrativa;  
* fuente del dato.

La persona tiene que volver a escribir todo. Además, el formulario actualmente envía únicamente el nombre del establecimiento, aunque la API ya admite varios de esos datos.

El recorrido debería ser:

> Consultar residencial → seleccionar establecimiento → comunicar preocupación → formulario ya completado.

La persona podría corregirlo o marcar:

> “La situación ocurre en otra dirección o en un posible anexo”.

Esto también evita que “Residencial Santa María”, “Santa Maria” y “Hogar Santa María” terminen almacenados como tres lugares diferentes.

## **7\. Completar el seguimiento que ya está casi hecho**

Acá hay código preparado que no está conectado:

* después del envío se guarda el código en `sessionStorage`;  
* `IntakeReportForm` recibe una función `onFollow`;  
* pero la pantalla final solamente muestra **“Volver al inicio”**;  
* `ReportStatusLookup` no lee el código guardado.

Agregaría dos botones:

**Consultar el estado ahora**  
 **Volver al inicio**

El primero debería abrir el seguimiento con el código ya escrito. También cambiaría:

* **“Seguir el trámite”** por **“Seguir una comunicación”**;  
* **“seguir el avance o hacer un reclamo”** por **“consultar el estado de esta comunicación”**, porque hoy no existe una función para hacer reclamos;  
* el mensaje que menciona internamente a **Resend** por algo como:

   “El correo quedó registrado, pero no fue posible enviar el código automáticamente. Guardalo antes de salir.”

En el resumen previo al envío agregaría:

> **Vas a enviar una comunicación anónima.**  
>  Se guardará la información sobre la situación, el lugar, la urgencia y los archivos.  
>  No se guardarán tu nombre, teléfono ni correo.  
>  El equipo no podrá contactarte.

Ese resumen era otro de los requisitos que todavía no quedó reflejado.

## **8\. Agregar una entrada externa mínima en “Equipos”**

Esto es un poco más que una corrección, pero sigue siendo acotado. Hoy el portal institucional muestra solamente la bandeja web:

function Team() {  
  return \<TeamIntakeInbox /\>;  
}

Sin embargo, el valor central de Alerta Mayor era reunir comunicaciones que llegan por distintos canales. Agregaría dos pestañas:

**Bandeja de entradas**  
 **Registrar entrada recibida por otro canal**

La segunda puede usar la misma tabla por ahora y pedir solamente:

* canal: llamada, WhatsApp, correo, presencial, Policía, salud u otro;  
* fecha y hora de recepción;  
* quién o qué institución comunicó;  
* referencia externa, si existe;  
* información recibida;  
* lugar;  
* urgencia inicial;  
* contacto seguro.

No reconectaría todavía todos los módulos antiguos de casos, visitas, medidas y habilitación, porque funcionan principalmente como simulaciones locales. Una pequeña entrada externa conectada a Supabase aporta mucho más a la historia del prototipo que cuatro módulos grandes que no guardan datos reales. Este vacío ya había quedado señalado en la revisión anterior.

## **9\. Dos correcciones pequeñas de privacidad técnica**

### **No enviar automáticamente direcciones sensibles al mapa**

Mientras la persona escribe una dirección, el navegador la envía a Nominatim/OpenStreetMap para buscar coordenadas. Para un formulario sobre posibles abusos, domicilios y residenciales, no lo haría automáticamente.

La solución más simple es:

* mantener el mapa público para consultar ELEPEM;  
* quitar la geocodificación automática del formulario de comunicación;  
* o incluir un botón voluntario **“Buscar esta dirección en el mapa”** con una advertencia previa.

También cambiaría **“Ubicación exacta encontrada”** por **“Coincidencia aproximada; confirmá que sea correcta”**.

### **Archivos**

Hoy la persona puede subir archivos, pero el equipo solamente ve nombre, tamaño y fecha; no puede abrirlos desde la bandeja. Para la demostración elegiría una de estas dos opciones:

* desactivar temporalmente los adjuntos;  
* o agregar acceso autenticado mediante un enlace temporal.

No dejaría activa la recepción de fotografías sensibles mientras el equipo no pueda revisarlas de forma segura.

## **Antes de volver a mostrarla públicamente**

La pantalla institucional todavía publica:

> Credenciales de prueba: **user / password**

Al mismo tiempo, el formulario permite guardar relatos, teléfonos, correos, ubicaciones y archivos. Lo más fácil es retirar esas credenciales de la interfaz, cambiar la contraseña y compartirla únicamente con el grupo. También pondría desde el comienzo, no solamente al final:

> **Prototipo de demostración. No ingreses nombres, teléfonos, direcciones ni archivos reales. La información no se deriva a ningún organismo.**

## **El orden que seguiría**

Para una siguiente versión corta haría, en este orden:

1. quitar credenciales públicas y reforzar el aviso de demostración;  
2. activar urgencia real y dejar de guardar todo como “Baja”;  
3. aplicar las reglas obligatorias de privacidad en pantalla y servidor;  
4. corregir el triage de tres estados;  
5. conectar el residencial seleccionado con el formulario;  
6. conectar confirmación y seguimiento;  
7. agregar la entrada externa mínima.

Con esos cambios, la app no sería necesariamente más grande, pero sí **mucho más coherente con lo que dice que hace**. No tocaría ahora los colores, la estructura general ni agregaría gestión completa de casos, inteligencia artificial o más módulos visuales.

