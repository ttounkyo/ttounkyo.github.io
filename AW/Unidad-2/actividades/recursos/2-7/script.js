// Tablero de colores: cuadrados que se iluminan al pasar el ratón
const contenedor = document.getElementById("container");
const botonCambiar = document.getElementById("btnCambiar");

// Devuelve un color hexadecimal aleatorio, por ejemplo "#3FA2C9"
function generarColorAleatorio() {
    const letras = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
        color += letras[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Pregunta un número hasta que sea válido. Devuelve el número, o null si el usuario pulsa Cancelar
function pedirNumero(mensaje, minimo, maximo) {
    while (true) {
        const respuesta = prompt(mensaje);

        if (respuesta === null) {
            return null; // ha pulsado Cancelar
        }

        const numero = parseInt(respuesta);

        if (respuesta.trim() === "") {
            alert("No puede estar vacío.");
        } else if (Number.isNaN(numero)) {
            alert("Tiene que ser un valor numérico.");
        } else if (numero < minimo || numero > maximo) {
            alert(`El número tiene que estar entre ${minimo} y ${maximo}.`);
        } else {
            return numero; // es válido: salimos de la función
        }
    }
}

function agregarColor(cuadrado) {
    const color = generarColorAleatorio();
    cuadrado.style.backgroundColor = color;
    cuadrado.style.boxShadow = `0 0 2px ${color}, 0 0 10px ${color}`;
}

function quitarColor(cuadrado) {
    // Al quitar el estilo, vuelve el color del CSS poco a poco (por la transición de 1 s)
    cuadrado.style.backgroundColor = "";
    cuadrado.style.boxShadow = "";
}

function generarCuadrados() {
    const cantidad = pedirNumero("¿Cuántos cuadrados quieres? (entre 1 y 500)", 1, 500);
    if (cantidad === null) {
        return;
    }

    for (let i = 1; i <= cantidad; i++) {
        const cuadrado = document.createElement("div");
        cuadrado.classList.add("square");
        cuadrado.textContent = i;

        cuadrado.addEventListener("mouseover", () => agregarColor(cuadrado));
        cuadrado.addEventListener("mouseout", () => quitarColor(cuadrado));

        contenedor.appendChild(cuadrado);
    }
}

// Pregunta a qué cuadrado hay que cambiarle el color y se lo cambia
function cambiarColor() {
    const cuadrados = document.querySelectorAll(".square"); // NodeList
    if (cuadrados.length === 0) {
        alert("Todavía no hay cuadrados.");
        return;
    }

    const numero = pedirNumero(`¿A qué cuadrado quieres cambiarle el color? (entre 1 y ${cuadrados.length})`, 1, cuadrados.length);
    if (numero !== null) {
        cuadrados[numero - 1].style.backgroundColor = generarColorAleatorio();
    }
}

botonCambiar.addEventListener("click", cambiarColor);
generarCuadrados();
