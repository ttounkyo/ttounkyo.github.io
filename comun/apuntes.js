/*
 * APUNTES: navegación y utilidades comunes de las asignaturas (AO, AW y DES)
 *
 * Cada asignatura tiene su index.html con la plantilla (menú, barra superior, portada) y, antes de cargar este
 * archivo, su configuración:
 *
 *   <script>
 *       window.APUNTES = {
 *           nombre: "Aplicaciones Web",        // en la barra superior
 *           sigla: "AW",                        // en el título de la pestaña: "Unidad 2 · AW"
 *           titulo: "SMX - APLICACIONES WEB",   // título de la pestaña en la portada
 *           clave: "aw",                        // prefijo con el que se guarda el avance en el navegador
 *           rutaNueva: ruta => null,            // opcional: enlaces antiguos -> página nueva
 *       };
 *   </script>
 *   <script src="../comun/apuntes.js"></script>
 */
const CONFIG = window.APUNTES;

/*
 * NAVEGACIÓN CON HASH
 * La página que se está viendo se guarda en la URL, por ejemplo:
 *   index.html#/Unidad-4/index                -> Unidad-4/index.html
 *   index.html#/Unidad-4/index?sec=5-tablas   -> y baja hasta el apartado "5. Tablas"
 *   index.html#/Unidad-4/actividades/4-1      -> Unidad-4/actividades/4-1.html
 * Así, al recargar (F5), usar Atrás/Adelante o compartir el enlace se mantiene la misma página
 * (y el apartado en el que estabas).
 */
const wrapper = document.getElementById("wrapper");
const contenido = document.getElementById("contenido");
const portada = contenido.innerHTML;
let paginaActual = null;
let titulosIndice = [];
let apartadoActual = null;
let cargadaEn = 0;

function leerHash() {
    const [ruta, query] = location.hash.replace(/^#\/?/, "").split("?");
    const sec = new URLSearchParams(query || "").get("sec");
    return { ruta, sec };
}

function irASeccion(sec, suave) {
    const destino = sec && document.getElementById(sec);
    if (!destino) {
        window.scrollTo({ top: 0, behavior: "instant" });
        return;
    }
    destino.scrollIntoView({ behavior: suave ? "smooth" : "instant", block: "start" });
    marcarApartadoActual();
    // Si la página aún se está cargando, o faltan imágenes por cargar (desplazan el contenido),
    // se vuelve a colocar el apartado cuando termina todo
    const esperas = [...contenido.querySelectorAll("img")].filter(img => !img.complete)
        .map(img => new Promise(ok => {
            img.addEventListener("load", ok, { once: true });
            img.addEventListener("error", ok, { once: true });
        }));
    if (document.readyState !== "complete") {
        esperas.push(new Promise(ok => window.addEventListener("load", ok, { once: true })));
    }
    if (esperas.length) {
        Promise.all(esperas).then(() => {
            destino.scrollIntoView({ behavior: "instant", block: "start" });
            marcarApartadoActual();
        });
    }
}

// Rutas antiguas que llevan a una página nueva (cada asignatura puede definir CONFIG.rutaNueva)
function rutaNueva(ruta) {
    return CONFIG.rutaNueva ? CONFIG.rutaNueva(ruta) : null;
}

async function mostrarPagina() {
    const { ruta, sec } = leerHash();
    cerrarPaneles();

    // Enlaces antiguos (por ejemplo, de la Unidad 8 de AO antes de reorganizarla): llevan a la página nueva
    const nueva = rutaNueva(ruta);
    if (nueva) {
        location.replace(`#/${nueva}`);
        return;
    }

    // Misma página, solo cambia el apartado: no se vuelve a descargar
    if (ruta && ruta === paginaActual) {
        irASeccion(sec, true);
        return;
    }

    titulosIndice = [];

    if (!ruta) {
        contenido.className = "";
        contenido.innerHTML = portada;
        document.title = CONFIG.titulo;
        paginaActual = null;
        actualizarMiga(null, null);
        marcarEnlaceActivo(null);
        document.getElementById("btnIndice").hidden = true;
        window.scrollTo({ top: 0, behavior: "instant" });
        return;
    }

    // Solo se permiten rutas internas sencillas (letras, números, guiones y barras)
    let html;
    try {
        if (!/^[\w\-\/]+$/.test(ruta)) throw new Error("ruta no válida");
        const res = await fetch(`${ruta}.html`);
        if (!res.ok) throw new Error(res.status);
        html = await res.text();
    } catch (e) {
        contenido.className = "";
        contenido.innerHTML = `<div class="aviso-error">
            <i class="bi bi-signpost-split"></i>
            <h1>No hemos encontrado esta página</h1>
            <p>Puede que el enlace esté mal escrito o que la página ya no exista.</p>
            <a class="btn btn-primary" href="#/">Ir al inicio de la asignatura</a></div>`;
        paginaActual = null;
        actualizarMiga(null, "Página no encontrada");
        marcarEnlaceActivo(null);
        return;
    }

    contenido.className = "";
    contenido.innerHTML = `<div class="pagina">${html}</div>
        <nav class="indice-lateral" id="indiceLateral" aria-label="Índice de la página" hidden></nav>`;
    paginaActual = ruta;
    cargadaEn = Date.now();

    const h1 = contenido.querySelector("h1");
    const titulo = h1 ? h1.textContent.trim() : "";
    document.title = titulo ? `${titulo} · ${CONFIG.sigla}` : CONFIG.titulo;

    prepararApartados();
    crearIndice();
    prepararChecklists();
    mostrarProgreso();
    marcarEnlaceActivo(ruta);
    actualizarMiga(ruta, titulo);

    // Editores SQL de la Unidad 6 (js/sql-editor.js)
    if (window.prepararEditoresSQL) {
        prepararEditoresSQL(contenido, ruta);
    }

    // Reaplicar Prism.js al nuevo contenido
    if (window.Prism) {
        Prism.highlightAll();
    }

    irASeccion(sec);
    contenido.focus({ preventScroll: true });
}

// Da un id a cada h2/h3 a partir de su texto: "5. Tablas" -> "5-tablas"
function prepararApartados() {
    contenido.querySelectorAll("h2, h3").forEach(h => {
        if (h.id) return;
        h.id = h.textContent.trim().toLowerCase()
            .normalize("NFD").replace(/[̀-ͯ]/g, "")
            .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    });
}

/*
 * ÍNDICE
 * - Teoría: los apartados (h2). Además del índice al principio (<div data-indice>), se crea un índice
 *   lateral que se queda fijo al bajar y marca el apartado que estás leyendo.
 * - Actividades: los pasos.
 * En pantallas pequeñas el índice lateral se abre con el botón flotante "Índice".
 */
function crearIndice() {
    const lateral = document.getElementById("indiceLateral");
    const btnIndice = document.getElementById("btnIndice");
    const esActividad = !!contenido.querySelector(".actividad .pasos");

    let titulos;
    if (esActividad) {
        titulos = [...contenido.querySelectorAll(".paso > h3, .actividad > h2")]
            .filter(h => h.textContent.trim() !== "Paso a paso");
    } else {
        titulos = [...contenido.querySelectorAll(".pagina h2")];
    }

    if (titulos.length < 3) {
        btnIndice.hidden = true;
        return;
    }

    let paso = 0;
    const enlaces = titulos.map(h => {
        const esPaso = h.tagName === "H3";
        const etiqueta = esPaso ? `<span class="indice-num">${++paso}</span>` : "";
        return `<li><a href="#/${paginaActual}?sec=${h.id}" data-sec="${h.id}">${etiqueta}<span>${h.textContent.trim()}</span></a></li>`;
    }).join("");

    lateral.innerHTML = `
        <div class="indice-lateral-cabecera">
            <span>${esActividad ? "Pasos de la actividad" : "En esta página"}</span>
            <button type="button" class="btn-close" aria-label="Cerrar índice"></button>
        </div>
        <ol class="list-unstyled">${enlaces}</ol>`;
    lateral.hidden = false;
    lateral.querySelector(".btn-close").addEventListener("click", cerrarPaneles);
    contenido.classList.add("con-indice");
    btnIndice.hidden = false;

    // Índice al principio de la teoría (útil en móvil y para ver la unidad de un vistazo)
    const hueco = contenido.querySelector("[data-indice]");
    if (hueco) {
        hueco.innerHTML = `
            <details class="indice" open>
                <summary><i class="bi bi-list-ol me-2"></i>Índice de la unidad</summary>
                <ol class="list-unstyled indice-lista">${titulos.map(h =>
            `<li><a href="#/${paginaActual}?sec=${h.id}">${h.textContent.trim()}</a></li>`).join("")}</ol>
            </details>`;
    }

    titulosIndice = titulos;
    apartadoActual = null;
    marcarApartadoActual();
}

// Marca en el índice el apartado que se está leyendo: el último título que ya ha pasado por arriba
function marcarApartadoActual() {
    const lateral = document.getElementById("indiceLateral");
    if (!lateral || !titulosIndice.length) return;
    let actual = titulosIndice[0];
    for (const h of titulosIndice) {
        if (h.getBoundingClientRect().top <= 140) actual = h;
        else break;
    }
    if (actual.id === apartadoActual) return;
    apartadoActual = actual.id;
    lateral.querySelectorAll("a").forEach(a => a.classList.toggle("actual", a.dataset.sec === actual.id));

    // Mantiene visible el enlace marcado dentro del índice (sin mover la página)
    const enlace = lateral.querySelector("a.actual");
    if (enlace && (enlace.offsetTop < lateral.scrollTop
        || enlace.offsetTop > lateral.scrollTop + lateral.clientHeight - 40)) {
        lateral.scrollTop = enlace.offsetTop - lateral.clientHeight / 2;
    }
    // Guarda el apartado en la URL (sin recargar) para que F5 vuelva al mismo sitio
    if (Date.now() - cargadaEn > 1500) {
        history.replaceState(null, "", `#/${paginaActual}?sec=${actual.id}`);
    }
}

// Listas de comprobación de las actividades: se guardan en el navegador del alumno
function prepararChecklists() {
    contenido.querySelectorAll(".checklist[data-actividad]").forEach(lista => {
        const clave = `${CONFIG.clave}-checklist-${lista.dataset.actividad}`;
        const casillas = [...lista.querySelectorAll("input[type=checkbox]")];
        let guardado = [];
        try { guardado = JSON.parse(localStorage.getItem(clave))?.hechos || []; } catch (e) { }
        casillas.forEach((c, i) => c.checked = !!guardado[i]);

        const actualizar = () => {
            const hechos = casillas.map(c => c.checked);
            const n = hechos.filter(Boolean).length;
            const barra = lista.parentElement.querySelector(".progreso-actividad");
            if (barra) {
                barra.querySelector(".progress-bar").style.width = `${(n / casillas.length) * 100}%`;
                barra.querySelector(".progreso-texto").textContent = n === casillas.length
                    ? "¡Todo comprobado! Ya puedes entregar." : `${n} de ${casillas.length} comprobados`;
            }
            try { localStorage.setItem(clave, JSON.stringify({ hechos, total: casillas.length })); } catch (e) { }
            marcarCompletadasMenu();
        };
        casillas.forEach(c => c.addEventListener("change", actualizar));
        actualizar();
    });
}

function leerProgreso(actividad) {
    try {
        const datos = JSON.parse(localStorage.getItem(`${CONFIG.clave}-checklist-${actividad}`));
        if (datos && datos.total) return { n: datos.hechos.filter(Boolean).length, total: datos.total };
    } catch (e) { }
    return null;
}

// En el listado de actividades, muestra cuántas comprobaciones lleva cada una
function mostrarProgreso() {
    contenido.querySelectorAll("[data-progreso]").forEach(el => {
        const p = leerProgreso(el.dataset.progreso);
        if (!p) return;
        el.textContent = p.n === p.total ? "✔ Completada" : `${p.n}/${p.total}`;
        el.className = `badge ${p.n === p.total ? "bg-success" : "bg-warning text-dark"}`;
    });
}

// Marca con un ✔ en el menú las actividades completadas
function marcarCompletadasMenu() {
    document.querySelectorAll("#barra-lateral [data-actividad]").forEach(a => {
        const p = leerProgreso(a.dataset.actividad);
        a.classList.toggle("completada", !!p && p.n === p.total);
    });
}

function marcarEnlaceActivo(ruta) {
    document.querySelectorAll("#barra-lateral a[href^='#/']").forEach(a => {
        const activo = !!ruta && a.getAttribute("href") === `#/${ruta}`;
        a.classList.toggle("active", activo);
        if (activo) {
            a.setAttribute("aria-current", "page");
            // Abre el submenú que contiene la página actual
            const sub = a.closest(".collapse");
            if (sub) {
                sub.classList.add("show");
                const boton = document.querySelector(`[data-bs-target="#${sub.id}"]`);
                if (boton) boton.setAttribute("aria-expanded", "true");
            }
        } else {
            a.removeAttribute("aria-current");
        }
    });
    // Marca también la unidad a la que pertenece la página
    const unidad = ruta && ruta.match(/^Unidad-(\d+)/);
    document.querySelectorAll("#barra-lateral [data-unidad]").forEach(el => {
        el.classList.toggle("unidad-actual", !!unidad && el.dataset.unidad === unidad[1]);
    });
}

// Barra superior: "Unidad 4 › Título de la página"
function actualizarMiga(ruta, titulo) {
    const miga = document.getElementById("miga");
    const unidad = ruta && ruta.match(/^Unidad-(\d+)/);
    if (!ruta && !titulo) {
        miga.innerHTML = `<span>${CONFIG.nombre}</span>`;
        return;
    }
    miga.innerHTML = (unidad ? `<a href="#/Unidad-${unidad[1]}/index">Unidad ${unidad[1]}</a><i class="bi bi-chevron-right"></i>` : "")
        + `<span class="miga-actual">${titulo || ""}</span>`;
}

// Menú lateral (móvil) e índice flotante
function cerrarPaneles() {
    wrapper.classList.remove("menu-abierto");
    document.getElementById("indiceLateral")?.classList.remove("abierto");
    document.body.classList.remove("panel-abierto");
}

// Cargar el menú y después la página que indique la URL
fetch("./nav/menu.html")
    .then((res) => res.text())
    .then((data) => {
        document.getElementById("barra-lateral").innerHTML = data;
        marcarEnlaceActivo(leerHash().ruta);
        marcarCompletadasMenu();
    });

document.getElementById("sidebarToggle").addEventListener("click", () => {
    const abrir = !wrapper.classList.contains("menu-abierto");
    cerrarPaneles();
    wrapper.classList.toggle("menu-abierto", abrir);
    document.body.classList.toggle("panel-abierto", abrir);
});
document.getElementById("fondoMenu").addEventListener("click", cerrarPaneles);

document.getElementById("btnIndice").addEventListener("click", () => {
    const lateral = document.getElementById("indiceLateral");
    if (!lateral) return;
    const abrir = !lateral.classList.contains("abierto");
    cerrarPaneles();
    lateral.classList.toggle("abierto", abrir);
    document.body.classList.toggle("panel-abierto", abrir);
});

// Botón "volver arriba" y barra de progreso de lectura
const btnArriba = document.getElementById("btnArriba");
const barraLectura = document.getElementById("barraLectura");
let pendienteScroll = false;
window.addEventListener("scroll", () => {
    if (!pendienteScroll) {
        pendienteScroll = true;
        requestAnimationFrame(() => { marcarApartadoActual(); pendienteScroll = false; });
    }
    btnArriba.hidden = window.scrollY < 600;
    const total = document.documentElement.scrollHeight - window.innerHeight;
    barraLectura.style.width = total > 0 ? `${(window.scrollY / total) * 100}%` : "0";
}, { passive: true });
btnArriba.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

window.addEventListener("hashchange", mostrarPagina);
mostrarPagina();

// Botones "Copiar texto" de las actividades y visor de capturas
document.addEventListener("click", e => {
    // Enlaces internos: si apuntan a donde ya estás, no hay "hashchange" y hay que ir a mano
    const enlace = e.target.closest("a[href^='#/']");
    if (enlace) {
        cerrarPaneles();
        if (enlace.getAttribute("href") === location.hash) {
            e.preventDefault();
            mostrarPagina();
        }
        return;
    }
    const copiar = e.target.closest("[data-copiar]");
    if (copiar) {
        // Solo los párrafos (así no se copia el texto del propio botón)
        const parrafos = document.getElementById(copiar.dataset.copiar).querySelectorAll("p");
        const texto = [...parrafos].map(p => p.textContent.replace(/\s+/g, " ").trim()).join("\n");
        navigator.clipboard.writeText(texto).then(() => {
            const original = copiar.innerHTML;
            copiar.innerHTML = '<i class="bi bi-check2"></i> ¡Copiado!';
            setTimeout(() => copiar.innerHTML = original, 2000);
        });
        return;
    }
    const img = e.target.closest(".actividad figure img");
    if (img) {
        const visor = document.getElementById("visor");
        visor.querySelector("img")?.remove();
        visor.prepend(img.cloneNode());
        visor.hidden = false;
    }
});
document.getElementById("visor").addEventListener("click", function () { this.hidden = true; });
document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
        document.getElementById("visor").hidden = true;
        cerrarPaneles();
    }
});

function copiarCodigo(boton) {
    const codigo = boton.nextElementSibling.querySelector("code");
    const texto = codigo.innerText;
    navigator.clipboard.writeText(texto).then(() => {
        boton.innerText = "¡Copiado!";
        setTimeout(() => boton.innerText = "Copiar", 2000);
    });
}
