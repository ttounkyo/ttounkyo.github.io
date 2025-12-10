// 1. Seleccionamos el elemento del título por su ID
const tituloProducto = document.getElementById('producto-titulo');
// Cambiamos su contenido de texto
tituloProducto.innerText = 'Increíble Teclado Mecánico';

// 2. Seleccionamos el elemento del precio
const precioProducto = document.getElementById('producto-precio');
// Actualizamos su texto
precioProducto.innerText = '99,99 €';

// 3. Aplicamos estilos al precio que acabamos de seleccionar
precioProducto.style.color = 'green';
precioProducto.style.fontWeight = 'bold';

// 4. Seleccionamos la imagen
const imagenProducto = document.getElementById('producto-imagen');
// Cambiamos su atributo 'src' para que muestre una nueva imagen
imagenProducto.setAttribute('src', 'https://via.placeholder.com/400x300.png/0000FF/FFFFFF?Text=Teclado');

// 5. Hacemos el botón interactivo
// Primero, seleccionamos el botón
const botonComprar = document.getElementById('boton-comprar');

// Luego, añadimos un "escuchador de eventos" para el 'click'
botonComprar.addEventListener('click', function () {
    // Este código se ejecutará SOLO cuando se haga clic en el botón

    // Cambiamos el texto del botón
    botonComprar.innerText = '¡Añadido al carrito!';

    // Deshabilitamos el botón
    botonComprar.disabled = true;
});
