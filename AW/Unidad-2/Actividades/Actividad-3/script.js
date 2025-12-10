// Seleccionamos los elementos del formulario una sola vez al cargar la página
const formulario = document.getElementById("formulario");
const nombreInput = document.getElementById("nombre");
const correoInput = document.getElementById("correo");

const nombreError = document.getElementById("nombre-error");
const correoError = document.getElementById("correo-error");
const mensajeGeneral = document.getElementById("mensaje");

// Esta es una Expresión Regular (RegEx) para validar emails de forma sencilla.
// Busca un patrón de "caracteres@caracteres.caracteres"
const regexCorreo = /^\S+@\S+\.\S+$/;

formulario.addEventListener("submit", function (event) {
    event.preventDefault(); // Evitamos el envío

    let esValido = true; // Usaremos esta variable para saber si el formulario es válido al final

    // --- Reseteamos los estilos y mensajes antes de cada validación ---
    nombreInput.classList.remove("is-valid", "is-invalid");
    correoInput.classList.remove("is-valid", "is-invalid");
    nombreError.textContent = "";
    correoError.textContent = "";
    mensajeGeneral.textContent = "";

    // --- Validación del Campo Nombre ---
    if (nombreInput.value.trim() === "") {
        nombreInput.classList.add("is-invalid"); // Añade clase de error
        nombreError.textContent = "El campo nombre es obligatorio.";
        esValido = false;
    } else {
        nombreInput.classList.add("is-valid"); // Añade clase de éxito
    }

    // --- Validación del Campo Correo ---
    if (correoInput.value.trim() === "") {
        correoInput.classList.add("is-invalid");
        correoError.textContent = "El campo correo es obligatorio.";
        esValido = false;
    } else if (!regexCorreo.test(correoInput.value.trim())) {
        // Usamos .test() para ver si el valor del correo cumple con la RegEx
        correoInput.classList.add("is-invalid");
        correoError.textContent = "El formato del correo no es válido.";
        esValido = false;
    } else {
        correoInput.classList.add("is-valid");
    }

    // --- Comprobación Final ---
    if (esValido) {
        mensajeGeneral.textContent = "Formulario enviado correctamente.";
        mensajeGeneral.style.color = "green";
        // Aquí podrías, por ejemplo, limpiar el formulario después de un envío exitoso
        // formulario.reset();
        // y quitar las clases de validación
        // nombreInput.classList.remove('is-valid');
        // correoInput.classList.remove('is-valid');
    } else {
        mensajeGeneral.textContent = "Por favor, corrige los errores señalados.";
        mensajeGeneral.style.color = "red";
    }
});
