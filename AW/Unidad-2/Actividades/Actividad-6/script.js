const formPelicula = document.getElementById('formPelicula');
const cuerpoTabla = document.getElementById('cuerpoTabla');

// Variables para el modal
let filaAEditar = null;
const modalElemento = new bootstrap.Modal(document.getElementById('modalEditar'));

// --- FUNCION AGREGAR ---
formPelicula.addEventListener('submit', (e) => {
    e.preventDefault(); // Evita que la página se recargue

    const titulo = document.getElementById('titulo').value;
    const genero = document.getElementById('genero').value;
    const url = document.getElementById('urlImagen').value;

    const nuevaFila = document.createElement('tr');
    nuevaFila.innerHTML = `
        <td><img src="${url}" class="img-tabla shadow-sm"></td>
        <td class="titulo-celda fw-bold">${titulo}</td>
        <td class="genero-celda">${genero}</td>
        <td class="text-center">
            <button class="btn btn-sm btn-warning me-2 btn-editar">Editar</button>
            <button class="btn btn-sm btn-danger btn-eliminar">Borrar</button>
        </td>
    `;

    // Evento Eliminar
    nuevaFila.querySelector('.btn-eliminar').onclick = () => nuevaFila.remove();

    // Evento Abrir Modal de Edición
    nuevaFila.querySelector('.btn-editar').onclick = () => abrirModal(nuevaFila);

    cuerpoTabla.appendChild(nuevaFila);
    formPelicula.reset(); // Limpiar formulario
});

// --- FUNCION ABRIR MODAL Y LLENAR DATOS ---
function abrirModal(fila) {
    filaAEditar = fila; // Guardamos la fila que queremos modificar

    // Cargamos los datos actuales de la fila en los inputs del modal
    document.getElementById('editTitulo').value = fila.querySelector('.titulo-celda').textContent;
    document.getElementById('editGenero').value = fila.querySelector('.genero-celda').textContent;
    document.getElementById('editUrl').value = fila.querySelector('img').src;

    modalElemento.show(); // Mostramos el popup
}

// --- FUNCION GUARDAR CAMBIOS ---
document.getElementById('btnGuardarCambios').onclick = () => {
    if (filaAEditar) {
        // Actualizamos los valores de la fila guardada
        filaAEditar.querySelector('.titulo-celda').textContent = document.getElementById('editTitulo').value;
        filaAEditar.querySelector('.genero-celda').textContent = document.getElementById('editGenero').value;
        filaAEditar.querySelector('img').src = document.getElementById('editUrl').value;

        modalElemento.hide(); // Cerramos el popup
        filaAEditar = null;    // Limpiamos la referencia
    }
};
