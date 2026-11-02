// 1. Seleccionamos los elementos del DOM
const input = document.getElementById('inputTarea');
const boton = document.getElementById('btnAgregar');
const lista = document.getElementById('listaTareas');

// 2. Función para agregar la tarea
boton.addEventListener('click', () => {
    const texto = input.value.trim();

    // Validación: No permitir tareas vacías
    if (texto === "") {
        alert("Escribe algo primero");
        return;
    }

    // --- NIVEL 1: Crear el elemento ---
    const nuevaTarea = document.createElement('li'); // Creamos el <li>
    nuevaTarea.textContent = texto; // Le ponemos el texto

    // --- NIVEL 2: Clases y Limpieza ---
    nuevaTarea.classList.add('tarea'); // Añadimos la clase CSS

    if (texto.toLowerCase().includes("importante")) {
        nuevaTarea.classList.add('urgente');
    }

    // --- NIVEL 3: Botón de eliminar ---
    const btnBorrar = document.createElement('button');
    btnBorrar.textContent = "Eliminar";
    btnBorrar.onclick = function () {
        nuevaTarea.remove(); // Borra el elemento <li>
    };

    // Unimos las piezas
    nuevaTarea.appendChild(btnBorrar); // Metemos el botón dentro del li
    lista.appendChild(nuevaTarea);     // Metemos el li dentro de la lista (ul)

    // Limpieza
    input.value = "";
    input.focus();
});
