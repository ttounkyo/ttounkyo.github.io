// =========== SECCIÓN 1: Buscar por ID ===========
function cambiarTexto() {
    // 1. Buscar elemento por su ID
    const elemento = document.getElementById('textoEjemplo');

    // 2. Verificar que existe
    if (elemento) {
        // 3. Cambiar su contenido
        elemento.textContent = '¡Texto modificado con éxito! 🎉';
        elemento.style.color = 'green';
        elemento.style.fontWeight = 'bold';
    } else {
        alert('No se encontró el elemento');
    }
}

function restaurarTexto() {
    const elemento = document.getElementById('textoEjemplo');
    if (elemento) {
        elemento.textContent = 'Este texto será modificado cuando hagas clic.';
        elemento.style.color = ''; // Quitar color
        elemento.style.fontWeight = ''; // Quitar negrita
    }
}

// =========== SECCIÓN 2: Buscar por Clase ===========
function cambiarColorClases() {
    // 1. Buscar TODOS los elementos con clase "ejemplo"
    const elementos = document.getElementsByClassName('ejemplo');

    // 2. Recorrer la colección (no es un array, es HTMLCollection)
    for (let i = 0; i < elementos.length; i++) {
        // 3. Cambiar propiedades de cada elemento
        elementos[i].style.color = 'red';
        elementos[i].style.backgroundColor = '#ffe6e6';
        elementos[i].style.padding = '10px';
        elementos[i].style.borderRadius = '5px';
    }
}

function restaurarClases() {
    const elementos = document.getElementsByClassName('ejemplo');

    for (let i = 0; i < elementos.length; i++) {
        elementos[i].style.color = 'blue';
        elementos[i].style.backgroundColor = '';
        elementos[i].style.padding = '';
        elementos[i].style.borderRadius = '';
    }
}

// =========== SECCIÓN 3: Crear Divs con Colores Aleatorios ===========
function generarColorAleatorio() {
    // Generar un color hexadecimal aleatorio
    const letras = '0123456789ABCDEF';
    let color = '#';

    for (let i = 0; i < 6; i++) {
        color += letras[Math.floor(Math.random() * 16)];
    }

    return color;
}

function crearDiv() {
    // 1. Buscar el contenedor
    const contenedor = document.getElementById('contenedorDivs');

    // 2. Crear un nuevo elemento div
    const nuevoDiv = document.createElement('div');

    // 3. Configurar propiedades del div
    nuevoDiv.className = 'nuevo-div';
    nuevoDiv.textContent = 'Div ' + (contenedor.children.length + 1);

    // 4. Asignar color aleatorio
    const colorAleatorio = generarColorAleatorio();
    nuevoDiv.style.backgroundColor = colorAleatorio;
    nuevoDiv.style.color = '#fff'; // Texto blanco para mejor contraste

    // 5. Añadir evento de clic
    nuevoDiv.onclick = function () {
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.style.transform = 'scale(1)';
        }, 200);
    };

    // 6. Insertar en el contenedor
    contenedor.appendChild(nuevoDiv);
}

function crear5Divs() {
    for (let i = 0; i < 5; i++) {
        crearDiv();
    }
}

function limpiarDivs() {
    const contenedor = document.getElementById('contenedorDivs');
    contenedor.innerHTML = ''; // Vaciar todo el contenido
}

// =========== SECCIÓN 4: Modificar Lista ===========
function agregarItem() {
    // 1. Obtener valor del input
    const input = document.getElementById('nuevoItem');
    const texto = input.value.trim();

    // 2. Validar que no esté vacío
    if (texto === '') {
        alert('Por favor, escribe algo');
        return;
    }

    // 3. Buscar la lista
    const lista = document.getElementById('listaElementos');

    // 4. Crear nuevo elemento de lista
    const nuevoLi = document.createElement('li');
    nuevoLi.textContent = texto;

    // 5. Añadir emoji aleatorio
    const emojis = ['🍎', '🍌', '🍊', '🍇', '🍓', '🍉', '🥭', '🍍'];
    const emojiAleatorio = emojis[Math.floor(Math.random() * emojis.length)];
    nuevoLi.textContent += ' ' + emojiAleatorio;

    // 6. Añadir evento para eliminar al hacer doble clic
    nuevoLi.ondblclick = function () {
        this.remove();
    };

    // 7. Insertar en la lista
    lista.appendChild(nuevoLi);

    // 8. Limpiar el input
    input.value = '';
    input.focus(); // Poner el cursor de nuevo en el input
}

function eliminarUltimo() {
    const lista = document.getElementById('listaElementos');
    const ultimoItem = lista.lastElementChild;

    if (ultimoItem) {
        ultimoItem.remove();
    } else {
        alert('No hay elementos para eliminar');
    }
}

// =========== SECCIÓN 5: Cajas Interactivas ===========
function cambiarCajas() {
    // Cambiar colores de las 3 cajas
    const caja1 = document.getElementById('caja1');
    const caja2 = document.getElementById('caja2');
    const caja3 = document.getElementById('caja3');

    if (caja1 && caja2 && caja3) {
        caja1.style.backgroundColor = generarColorAleatorio();
        caja2.style.backgroundColor = generarColorAleatorio();
        caja3.style.backgroundColor = generarColorAleatorio();

        // Cambiar también el color del texto para que sea visible
        caja1.style.color = 'white';
        caja2.style.color = 'white';
        caja3.style.color = 'white';
    }
}

let cajasVisibles = true;

function esconderCajas() {
    const caja1 = document.getElementById('caja1');
    const caja2 = document.getElementById('caja2');
    const caja3 = document.getElementById('caja3');

    if (cajasVisibles) {
        // Esconder
        caja1.style.opacity = '0.3';
        caja2.style.opacity = '0.3';
        caja3.style.opacity = '0.3';
        cajasVisibles = false;
    } else {
        // Mostrar
        caja1.style.opacity = '1';
        caja2.style.opacity = '1';
        caja3.style.opacity = '1';
        cajasVisibles = true;
    }
}

// =========== EJERCICIOS ADICIONALES PARA LOS ESTUDIANTES ===========
// Estas funciones pueden ser completadas por los estudiantes

function ejercicio1() {
    // TAREA: Cambiar el título principal (h1)
    // 1. Buscar el elemento h1
    // 2. Cambiar su texto a "¡DOM Manipulado!"
    // 3. Cambiar su color a morado (#8A2BE2)
}

function ejercicio2() {
    // TAREA: Contar cuántos divs hay en la página
    // 1. Buscar todos los divs
    // 2. Mostrar un alert con el número total
}

function ejercicio3() {
    // TAREA: Crear un botón que alerte el texto de todos los párrafos
    // 1. Buscar todos los párrafos (etiqueta <p>)
    // 2. Recorrerlos y concatenar sus textos
    // 3. Mostrar el resultado en un alert
}
