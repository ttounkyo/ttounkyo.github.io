/*
 * EDITOR SQL (Unidad 6)
 * Convierte cada <div class="sql-editor"> de una página en un editor donde el alumno escribe SQL y lo ejecuta
 * en el navegador, sin instalar nada. Por dentro usa SQLite (sql.js), pero entiende las órdenes de MySQL que se
 * ven en clase: SHOW TABLES, DESCRIBE, AUTO_INCREMENT, ALTER TABLE ... ADD PRIMARY KEY / AFTER / FIRST / MODIFY...
 *
 * Cómo se escribe un editor en una página:
 *
 *   <div class="sql-editor" data-bd="tienda">
 *       <textarea>SELECT * FROM Articulos;</textarea>
 *       <script type="text/plain" class="solucion">SELECT Nombre FROM Articulos;</script>
 *   </div>
 *
 * - data-bd: base de datos de partida (Unidad-6/bd/<nombre>.sql). Sin data-bd, se empieza con una base vacía.
 * - <script class="previo">: SQL que se ejecuta antes sin que el alumno lo vea (por ejemplo, las tablas de los
 *   pasos anteriores).
 * - <script class="solucion">: si está, aparecen los botones "Comprobar" y "Ver la solución".
 * - <script class="comprobar">: consulta que se ejecuta después del código del alumno y de la solución para
 *   comparar cómo ha quedado la base de datos (para CREATE, ALTER, INSERT, UPDATE y DELETE). Sin ella, se compara
 *   el resultado de la última consulta.
 * - data-columnas: además de los datos, comprueba los nombres de las columnas (para practicar AS).
 * - data-orden="si" / "no": fuerza a tener en cuenta (o no) el orden de las filas. Por defecto, solo cuenta si la
 *   solución lleva ORDER BY.
 *
 * Cada vez que se pulsa "Ejecutar", la base de datos vuelve a empezar desde el principio y se ejecuta todo el
 * código del editor, como un guion. Así no hay errores por haber ejecutado dos veces el mismo INSERT.
 */
(function () {
    const CDN = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/";

    /* ------------------------------------------------------------------------------------------------
     * MOTOR: partir el texto, traducir lo de MySQL que SQLite no entiende y ejecutar
     * ---------------------------------------------------------------------------------------------- */

    // Parte el texto en sentencias por los ";" que no están dentro de comillas, y quita los comentarios
    function partirSentencias(texto) {
        const sentencias = [];
        let actual = "";
        let i = 0;
        while (i < texto.length) {
            const c = texto[i];
            const sig = texto[i + 1];
            if ((c === "-" && sig === "-") || c === "#") {
                const fin = texto.indexOf("\n", i);
                i = fin === -1 ? texto.length : fin;
                continue;
            }
            if (c === "/" && sig === "*") {
                const fin = texto.indexOf("*/", i + 2);
                i = fin === -1 ? texto.length : fin + 2;
                actual += " ";
                continue;
            }
            if (c === "'" || c === '"' || c === "`") {
                let j = i + 1;
                let cadena = c;
                while (j < texto.length) {
                    // \' de MySQL -> '' de SQL estándar
                    if (texto[j] === "\\" && c !== "`" && j + 1 < texto.length) {
                        cadena += texto[j + 1] === c ? c + c : texto[j + 1];
                        j += 2;
                        continue;
                    }
                    if (texto[j] === c) {
                        if (texto[j + 1] === c) { cadena += c + c; j += 2; continue; }
                        break;
                    }
                    cadena += texto[j];
                    j++;
                }
                actual += cadena + c;
                i = j + 1;
                continue;
            }
            if (c === ";") {
                if (actual.trim()) sentencias.push(actual.trim());
                actual = "";
                i++;
                continue;
            }
            actual += c;
            i++;
        }
        if (actual.trim()) sentencias.push(actual.trim());
        return sentencias;
    }

    // Parte por las comas que no están dentro de paréntesis ni de comillas: "a INT, PRIMARY KEY (a, b)"
    function partirPorComas(texto) {
        const partes = [];
        let nivel = 0, comilla = null, actual = "";
        for (let i = 0; i < texto.length; i++) {
            const c = texto[i];
            if (comilla) {
                if (c === comilla) comilla = null;
            } else if (c === "'" || c === '"' || c === "`") {
                comilla = c;
            } else if (c === "(") {
                nivel++;
            } else if (c === ")") {
                nivel--;
            } else if (c === "," && nivel === 0) {
                partes.push(actual.trim());
                actual = "";
                continue;
            }
            actual += c;
        }
        if (actual.trim()) partes.push(actual.trim());
        return partes;
    }

    const NOMBRE = "(`[^`]+`|\"[^\"]+\"|[^\\s(),;]+)";
    const limpiar = n => n.trim().replace(/^[`"\[]|[`"\]]$/g, "");
    const comillas = n => `"${n.replace(/"/g, '""')}"`;
    const listaNombres = texto => partirPorComas(texto).map(n => limpiar(n.replace(/\(\d+\)$/, "")));

    // Lee una definición de columna de MySQL: "Precio DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER Nombre"
    function leerColumna(def) {
        let resto = def.trim();
        let posicion = null;
        let m = resto.match(new RegExp(`\\s+(FIRST|AFTER\\s+${NOMBRE})\\s*$`, "i"));
        if (m) {
            posicion = /^FIRST/i.test(m[1]) ? { primera: true } : { despues: limpiar(m[2]) };
            resto = resto.slice(0, m.index);
        }
        m = resto.match(new RegExp(`^${NOMBRE}\\s*([\\s\\S]*)$`));
        if (!m) throw new Error(`No entiendo la definición de columna «${def}»`);
        const nombre = limpiar(m[1]);
        resto = " " + m[2] + " ";

        resto = resto.replace(/\sCOMMENT\s+'(?:[^']|'')*'/i, " ");
        resto = resto.replace(/\sON\s+UPDATE\s+CURRENT_TIMESTAMP(\(\))?/i, " ");
        let dflt = null;
        m = resto.match(/\sDEFAULT\s+('(?:[^']|'')*'|\([^)]*\)|[^\s,]+)/i);
        if (m) {
            dflt = m[1].toUpperCase() === "NULL" ? null : m[1];
            resto = resto.replace(m[0], " ");
        }
        const autoinc = /\sAUTO_INCREMENT(?=\s)/i.test(resto);
        resto = resto.replace(/\sAUTO_INCREMENT(?=\s)/ig, " ");
        const esPk = /\sPRIMARY\s+KEY(?=\s)/i.test(resto);
        resto = resto.replace(/\sPRIMARY\s+KEY(?=\s)/ig, " ");
        const esUnica = /\sUNIQUE(\s+KEY)?(?=\s)/i.test(resto);
        resto = resto.replace(/\sUNIQUE(\s+KEY)?(?=\s)/ig, " ");
        const noNulo = /\sNOT\s+NULL(?=\s)/i.test(resto);
        resto = resto.replace(/\sNOT\s+NULL(?=\s)/ig, " ").replace(/\sNULL(?=\s)/ig, " ");

        let tipo = resto.replace(/\s+/g, " ").trim();
        if (/^ENUM\s*\(/i.test(tipo) || /^SET\s*\(/i.test(tipo)) tipo = "VARCHAR(255)";
        if (autoinc) tipo = "INTEGER";
        return { col: { nombre, tipo, noNulo: noNulo || esPk, dflt }, posicion, esPk, esUnica, autoinc };
    }

    // CREATE TABLE de MySQL -> CREATE TABLE que entiende SQLite
    function prepararCreate(s, estado) {
        const m = s.match(new RegExp(`^(CREATE\\s+(?:TEMPORARY\\s+)?TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${NOMBRE})\\s*\\(`, "i"));
        if (!m) return s;
        const tabla = limpiar(m[2]);
        // Cierre del paréntesis principal (lo que viene detrás son opciones de MySQL: ENGINE=..., CHARSET=...)
        let nivel = 0, cierre = -1, comilla = null;
        for (let i = m[0].length - 1; i < s.length; i++) {
            const c = s[i];
            if (comilla) { if (c === comilla) comilla = null; continue; }
            if (c === "'" || c === '"' || c === "`") comilla = c;
            else if (c === "(") nivel++;
            else if (c === ")" && --nivel === 0) { cierre = i; break; }
        }
        if (cierre === -1) return s;
        const defs = [];
        for (const def of partirPorComas(s.slice(m[0].length, cierre))) {
            if (/^(KEY|INDEX|FULLTEXT)\b/i.test(def)) continue;
            if (/^(CONSTRAINT|PRIMARY|FOREIGN|CHECK)\b/i.test(def)) {
                defs.push(def.replace(/\bUSING\s+\w+/ig, ""));
                continue;
            }
            if (/^UNIQUE\b/i.test(def)) {
                defs.push(def.replace(/^UNIQUE\s+(KEY|INDEX)?\s*(`[^`]+`|\w+)?\s*\(/i, "UNIQUE ("));
                continue;
            }
            const c = leerColumna(def);
            if (c.autoinc) estado.autoinc[tabla.toLowerCase()] = c.col.nombre;
            let texto = `${comillas(c.col.nombre)} ${c.col.tipo}`;
            if (c.col.noNulo && !c.esPk) texto += " NOT NULL";
            if (c.col.dflt !== null) texto += ` DEFAULT ${c.col.dflt}`;
            if (c.esPk) texto += " PRIMARY KEY";
            if (c.esUnica) texto += " UNIQUE";
            const ref = def.match(/\sREFERENCES\s[\s\S]*$/i);
            if (ref) texto += ref[0];
            defs.push(texto);
        }
        return `${m[1]} (\n${defs.join(",\n")}\n)`;
    }

    function filas(db, sql, parametros) {
        const st = db.prepare(sql);
        if (parametros) st.bind(parametros);
        const res = [];
        while (st.step()) res.push(st.get());
        st.free();
        return res;
    }

    // Lee cómo es una tabla (columnas, clave primaria, claves ajenas y UNIQUE) para poder reconstruirla
    function leerTabla(db, nombre) {
        const t = filas(db, "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND lower(name) = lower(?)", [nombre]);
        if (!t.length) throw new Error(`no such table: ${nombre}`);
        const [real, sqlOriginal] = t[0];
        const cols = filas(db, 'SELECT name, type, "notnull", dflt_value, pk FROM pragma_table_info(?) ORDER BY cid', [real])
            .map(([nombre, tipo, noNulo, dflt, pk]) => ({ nombre, tipo, noNulo: !!noNulo, dflt, pk }));
        const pk = cols.filter(c => c.pk).sort((a, b) => a.pk - b.pk).map(c => c.nombre);

        const nombresFk = {};
        for (const m of (sqlOriginal || "").matchAll(/CONSTRAINT\s+("[^"]+"|`[^`]+`|\w+)\s+FOREIGN\s+KEY\s*\(([^)]*)\)/gi)) {
            nombresFk[listaNombres(m[2]).join(",").toLowerCase()] = limpiar(m[1]);
        }
        const fks = [];
        for (const [id, , tabla, desde, hacia, onUpdate, onDelete] of
            filas(db, 'SELECT id, seq, "table", "from", "to", on_update, on_delete FROM pragma_foreign_key_list(?) ORDER BY id, seq', [real])) {
            let fk = fks.find(f => f.id === id);
            if (!fk) fks.push(fk = { id, tabla, cols: [], refs: [], onUpdate, onDelete });
            fk.cols.push(desde);
            if (hacia) fk.refs.push(hacia);
        }
        fks.forEach(f => f.nombre = nombresFk[f.cols.join(",").toLowerCase()] || null);

        const unicas = [];
        for (const [nombreIndice, origen] of filas(db, "SELECT name, origin FROM pragma_index_list(?)", [real])) {
            if (origen !== "u") continue;
            unicas.push(filas(db, "SELECT name FROM pragma_index_info(?) ORDER BY seqno", [nombreIndice]).map(f => f[0]));
        }
        return { nombre: real, cols: cols.map(({ pk, ...c }) => c), pk, fks, unicas };
    }

    function sqlTabla(t, nombre) {
        const defs = t.cols.map(c => `${comillas(c.nombre)} ${c.tipo || ""}`.trim()
            + (c.noNulo ? " NOT NULL" : "") + (c.dflt !== null && c.dflt !== undefined ? ` DEFAULT ${c.dflt}` : ""));
        if (t.pk.length) defs.push(`PRIMARY KEY (${t.pk.map(comillas).join(", ")})`);
        t.unicas.forEach(u => defs.push(`UNIQUE (${u.map(comillas).join(", ")})`));
        t.fks.forEach(f => {
            let d = (f.nombre ? `CONSTRAINT ${comillas(f.nombre)} ` : "")
                + `FOREIGN KEY (${f.cols.map(comillas).join(", ")}) REFERENCES ${comillas(f.tabla)}`
                + (f.refs.length ? ` (${f.refs.map(comillas).join(", ")})` : "");
            if (f.onDelete && f.onDelete !== "NO ACTION") d += ` ON DELETE ${f.onDelete}`;
            if (f.onUpdate && f.onUpdate !== "NO ACTION") d += ` ON UPDATE ${f.onUpdate}`;
            defs.push(d);
        });
        return `CREATE TABLE ${comillas(nombre)} (\n${defs.join(",\n")}\n)`;
    }

    // Crea la tabla nueva, copia los datos y borra la antigua (así hace SQLite los cambios que no sabe hacer solo)
    function reconstruir(db, antes, despues, origen) {
        const tmp = `${despues.nombre}__nueva`;
        db.run("PRAGMA foreign_keys = OFF");
        db.run("BEGIN");
        try {
            db.run(sqlTabla(despues, tmp));
            const copiar = despues.cols.filter(c => origen[c.nombre]);
            if (copiar.length) {
                db.run(`INSERT INTO ${comillas(tmp)} (${copiar.map(c => comillas(c.nombre)).join(", ")}) `
                    + `SELECT ${copiar.map(c => comillas(origen[c.nombre])).join(", ")} FROM ${comillas(antes.nombre)}`);
            }
            db.run(`DROP TABLE ${comillas(antes.nombre)}`);
            db.run(`ALTER TABLE ${comillas(tmp)} RENAME TO ${comillas(despues.nombre)}`);
            if (filas(db, "SELECT * FROM pragma_foreign_key_check(?)", [despues.nombre]).length) {
                throw new Error("FOREIGN KEY constraint failed");
            }
            db.run("COMMIT");
        } catch (e) {
            db.run("ROLLBACK");
            throw e;
        } finally {
            db.run("PRAGMA foreign_keys = ON");
        }
    }

    // ALTER TABLE de MySQL (puede llevar varios cambios separados por comas)
    function alterar(db, s, estado) {
        const m = s.match(new RegExp(`^ALTER\\s+TABLE\\s+${NOMBRE}\\s+([\\s\\S]+)$`, "i"));
        if (!m) throw new Error(`near "ALTER": syntax error`);
        const clausulas = partirPorComas(m[2]);
        const t = leerTabla(db, limpiar(m[1]));
        const antes = JSON.parse(JSON.stringify(t));
        const origen = Object.fromEntries(t.cols.map(c => [c.nombre, c.nombre]));
        const clave = t.nombre.toLowerCase();
        let renombrar = null;

        const buscar = nombre => {
            const i = t.cols.findIndex(c => c.nombre.toLowerCase() === nombre.toLowerCase());
            if (i === -1) throw new Error(`no such column: ${nombre}`);
            return i;
        };
        const colocar = (col, posicion, indiceActual) => {
            if (indiceActual !== undefined) t.cols.splice(indiceActual, 1);
            if (posicion && posicion.primera) t.cols.unshift(col);
            else if (posicion && posicion.despues) t.cols.splice(buscar(posicion.despues) + 1, 0, col);
            else if (indiceActual !== undefined) t.cols.splice(indiceActual, 0, col);
            else t.cols.push(col);
        };
        const aplicarColumna = (c, nombreAnterior) => {
            if (c.esPk) { t.pk = [c.col.nombre]; }
            if (c.esUnica) t.unicas.push([c.col.nombre]);
            if (c.autoinc) estado.autoinc[clave] = c.col.nombre;
            else if (nombreAnterior && estado.autoinc[clave] === nombreAnterior) delete estado.autoinc[clave];
        };
        const renombrarEnClaves = (viejo, nuevo) => {
            const cambia = n => n.toLowerCase() === viejo.toLowerCase() ? nuevo : n;
            t.pk = t.pk.map(cambia);
            t.unicas = t.unicas.map(u => u.map(cambia));
            t.fks.forEach(f => f.cols = f.cols.map(cambia));
        };

        for (let cl of clausulas) {
            let x;
            cl = cl.trim();
            if ((x = cl.match(/^ADD\s+(?:CONSTRAINT\s+\S*\s+)?PRIMARY\s+KEY\s*\(([^)]*)\)/i))) {
                if (t.pk.length) throw new Error("Multiple primary key defined");
                t.pk = listaNombres(x[1]).map(n => t.cols[buscar(n)].nombre);
                t.cols.forEach(c => { if (t.pk.includes(c.nombre)) c.noNulo = true; });
            } else if ((x = cl.match(/^ADD\s+(?:CONSTRAINT\s*(`[^`]+`|"[^"]+"|\w+)?\s+)?FOREIGN\s+KEY\s*(?:`[^`]+`|\w+)?\s*\(([^)]*)\)\s*REFERENCES\s+(`[^`]+`|"[^"]+"|[^\s(]+)\s*(?:\(([^)]*)\))?([\s\S]*)$/i))) {
                const reglas = x[5] || "";
                const regla = tipo => {
                    const r = reglas.match(new RegExp(`ON\\s+${tipo}\\s+(RESTRICT|CASCADE|SET\\s+NULL|NO\\s+ACTION|SET\\s+DEFAULT)`, "i"));
                    return r ? r[1].toUpperCase().replace(/\s+/g, " ") : null;
                };
                const destino = leerTabla(db, limpiar(x[3]));
                t.fks.push({
                    nombre: x[1] ? limpiar(x[1]) : null,
                    cols: listaNombres(x[2]).map(n => t.cols[buscar(n)].nombre),
                    tabla: destino.nombre,
                    refs: x[4] ? listaNombres(x[4]) : destino.pk,
                    onDelete: regla("DELETE"), onUpdate: regla("UPDATE"),
                });
            } else if ((x = cl.match(/^ADD\s+(?:CONSTRAINT\s+\S+\s+)?UNIQUE\s*(?:KEY|INDEX)?\s*(?:`[^`]+`|\w+)?\s*\(([^)]*)\)/i))) {
                t.unicas.push(listaNombres(x[1]).map(n => t.cols[buscar(n)].nombre));
            } else if (/^ADD\s+(INDEX|KEY|FULLTEXT)\b/i.test(cl)) {
                continue;
            } else if ((x = cl.match(/^ADD\s+(?:COLUMN\s+)?([\s\S]+)$/i))) {
                const c = leerColumna(x[1]);
                if (t.cols.some(col => col.nombre.toLowerCase() === c.col.nombre.toLowerCase())) {
                    throw new Error(`duplicate column name: ${c.col.nombre}`);
                }
                colocar(c.col, c.posicion);
                aplicarColumna(c);
            } else if (/^DROP\s+PRIMARY\s+KEY$/i.test(cl)) {
                t.pk = [];
                delete estado.autoinc[clave];
            } else if ((x = cl.match(/^DROP\s+FOREIGN\s+KEY\s+(\S+)$/i))) {
                const nombre = limpiar(x[1]).toLowerCase();
                let i = t.fks.findIndex(f => (f.nombre || "").toLowerCase() === nombre);
                if (i === -1 && t.fks.length === 1) i = 0;
                if (i === -1) throw new Error(`No hay ninguna clave ajena llamada ${x[1]}`);
                t.fks.splice(i, 1);
            } else if (/^DROP\s+(INDEX|KEY)\s+/i.test(cl)) {
                continue;
            } else if ((x = cl.match(/^DROP\s+(?:COLUMN\s+)?(\S+)$/i))) {
                const i = buscar(limpiar(x[1]));
                const nombre = t.cols[i].nombre;
                t.cols.splice(i, 1);
                delete origen[nombre];
                t.pk = t.pk.filter(n => n !== nombre);
                t.unicas = t.unicas.filter(u => !u.includes(nombre));
                t.fks = t.fks.filter(f => !f.cols.includes(nombre));
                if (estado.autoinc[clave] === nombre) delete estado.autoinc[clave];
            } else if ((x = cl.match(/^MODIFY\s+(?:COLUMN\s+)?([\s\S]+)$/i))) {
                const c = leerColumna(x[1]);
                const i = buscar(c.col.nombre);
                c.col.nombre = t.cols[i].nombre;
                if (t.pk.includes(c.col.nombre)) c.col.noNulo = true;
                colocar(c.col, c.posicion, i);
                aplicarColumna(c, c.col.nombre);
            } else if ((x = cl.match(new RegExp(`^CHANGE\\s+(?:COLUMN\\s+)?${NOMBRE}\\s+([\\s\\S]+)$`, "i")))) {
                const i = buscar(limpiar(x[1]));
                const viejo = t.cols[i].nombre;
                const c = leerColumna(x[2]);
                delete origen[viejo];
                origen[c.col.nombre] = viejo;
                renombrarEnClaves(viejo, c.col.nombre);
                if (t.pk.includes(c.col.nombre)) c.col.noNulo = true;
                colocar(c.col, c.posicion, i);
                aplicarColumna(c, viejo);
            } else if ((x = cl.match(new RegExp(`^RENAME\\s+COLUMN\\s+${NOMBRE}\\s+TO\\s+${NOMBRE}$`, "i")))) {
                const i = buscar(limpiar(x[1]));
                const viejo = t.cols[i].nombre;
                const nuevo = limpiar(x[2]);
                t.cols[i].nombre = nuevo;
                delete origen[viejo];
                origen[nuevo] = viejo;
                renombrarEnClaves(viejo, nuevo);
                if (estado.autoinc[clave] === viejo) estado.autoinc[clave] = nuevo;
            } else if ((x = cl.match(new RegExp(`^RENAME\\s+(?:TO\\s+|AS\\s+)?${NOMBRE}$`, "i")))) {
                renombrar = limpiar(x[1]);
            } else if ((x = cl.match(new RegExp(`^ALTER\\s+(?:COLUMN\\s+)?${NOMBRE}\\s+(SET\\s+DEFAULT\\s+([\\s\\S]+)|DROP\\s+DEFAULT)$`, "i")))) {
                t.cols[buscar(limpiar(x[1]))].dflt = x[3] ? x[3].trim() : null;
            } else {
                throw new Error(`Esta parte del ALTER TABLE no se puede usar en el editor: «${cl}»`);
            }
        }

        if (JSON.stringify(t) !== JSON.stringify(antes)) reconstruir(db, antes, t, origen);
        if (renombrar) {
            db.run(`ALTER TABLE ${comillas(t.nombre)} RENAME TO ${comillas(renombrar)}`);
            if (estado.autoinc[clave]) {
                estado.autoinc[renombrar.toLowerCase()] = estado.autoinc[clave];
                delete estado.autoinc[clave];
            }
        }
    }

    // DESCRIBE tabla, con las mismas columnas que enseña MySQL
    function describir(db, nombre, estado) {
        const t = leerTabla(db, nombre);
        const auto = estado.autoinc[t.nombre.toLowerCase()];
        const enFk = new Set(t.fks.flatMap(f => f.cols));
        const unicas = new Set(t.unicas.filter(u => u.length === 1).map(u => u[0]));
        return {
            columnas: ["Field", "Type", "Null", "Key", "Default", "Extra"],
            filas: t.cols.map(c => [
                c.nombre,
                c.nombre === auto ? "int" : (c.tipo || "").toLowerCase(),
                c.noNulo || t.pk.includes(c.nombre) ? "NO" : "YES",
                t.pk.includes(c.nombre) ? "PRI" : unicas.has(c.nombre) ? "UNI" : enFk.has(c.nombre) ? "MUL" : "",
                c.dflt === null || c.dflt === undefined ? null : String(c.dflt).replace(/^'|'$/g, ""),
                c.nombre === auto ? "auto_increment" : "",
            ]),
        };
    }

    // Ejecuta una sentencia y devuelve lo que hay que enseñar
    function ejecutarSentencia(db, s, estado) {
        let m;
        const orden = s.split(/\s+/, 2).join(" ").toUpperCase();

        if (/^(CREATE|DROP)\s+(DATABASE|SCHEMA)\b/i.test(s) || /^USE\s/i.test(s)) {
            return { aviso: "En el editor ya trabajas dentro de una base de datos, así que esta orden no cambia nada. En MySQL (phpMyAdmin) sí hace falta." };
        }
        if (/^SHOW\s+(FULL\s+)?TABLES\b/i.test(s)) {
            s = "SELECT name AS Tablas FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name";
        } else if ((m = s.match(new RegExp(`^(?:DESCRIBE|DESC|EXPLAIN)\\s+${NOMBRE}$`, "i")) || s.match(new RegExp(`^SHOW\\s+(?:FULL\\s+)?COLUMNS\\s+FROM\\s+${NOMBRE}$`, "i")))) {
            return describir(db, limpiar(m[1]), estado);
        } else if ((m = s.match(new RegExp(`^ESTRUCTURA\\s+${NOMBRE}$`, "i")))) {
            // Para comprobar ejercicios de CREATE/ALTER: columnas en orden, tipo general y si son clave.
            // No se fija en los tamaños (VARCHAR(50) y VARCHAR(100) valen igual)
            const t = leerTabla(db, limpiar(m[1]));
            const general = tipo => /INT/i.test(tipo) ? "entero" : /CHAR|TEXT/i.test(tipo) ? "texto"
                : /DEC|NUM|FLOAT|DOUBLE|REAL/i.test(tipo) ? "decimal" : /DATE|TIME/i.test(tipo) ? "fecha"
                    : /BOOL/i.test(tipo) ? "booleano" : (tipo || "").toLowerCase();
            return {
                columnas: ["columna", "tipo", "clave_primaria"],
                filas: t.cols.map(c => [c.nombre.toLowerCase(), general(c.tipo), t.pk.includes(c.nombre) ? "sí" : "no"]),
            };
        } else if ((m = s.match(new RegExp(`^CLAVES_AJENAS\\s+${NOMBRE}$`, "i")))) {
            const t = leerTabla(db, limpiar(m[1]));
            return {
                columnas: ["columna", "tabla", "columna_tabla"],
                filas: t.fks.flatMap(f => f.cols.map((c, i) => [c.toLowerCase(), f.tabla.toLowerCase(), (f.refs[i] || "").toLowerCase()])),
            };
        } else if ((m = s.match(new RegExp(`^TRUNCATE\\s+(?:TABLE\\s+)?${NOMBRE}$`, "i")))) {
            s = `DELETE FROM ${m[1]}`;
        } else if (/^ALTER\s+TABLE\b/i.test(s)) {
            alterar(db, s, estado);
            return { hecho: "ALTER TABLE" };
        } else if (/^CREATE\s+(TEMPORARY\s+)?TABLE\b/i.test(s)) {
            s = prepararCreate(s, estado);
        } else if ((m = s.match(new RegExp(`^(INSERT|REPLACE)\\s+(?:INTO\\s+)?${NOMBRE}\\s+SET\\s+([\\s\\S]+)$`, "i")))) {
            const pares = partirPorComas(m[3]).map(p => { const i = p.indexOf("="); return [p.slice(0, i).trim(), p.slice(i + 1).trim()]; });
            s = `${m[1]} INTO ${m[2]} (${pares.map(p => p[0]).join(", ")}) VALUES (${pares.map(p => p[1]).join(", ")})`;
        } else if ((m = s.match(new RegExp(`^DROP\\s+TABLE\\s+(IF\\s+EXISTS\\s+)?([\\s\\S]+)$`, "i")))) {
            // MySQL deja borrar varias tablas a la vez: DROP TABLE a, b
            const tablas = partirPorComas(m[2]);
            if (tablas.length > 1) {
                tablas.forEach(t => db.run(`DROP TABLE ${m[1] || ""}${t}`));
                return { hecho: "DROP TABLE" };
            }
        }

        const st = db.prepare(s);
        try {
            const columnas = st.getColumnNames();
            if (columnas.length) {
                const res = [];
                while (st.step()) res.push(st.get());
                return { columnas, filas: res };
            }
            st.step();
        } finally {
            st.free();
        }
        if (/^(INSERT|REPLACE|UPDATE|DELETE)\b/i.test(s)) return { afectadas: db.getRowsModified(), orden: orden.split(" ")[0] };
        if (/^DROP\s+TABLE\b/i.test(s)) {
            const t = s.match(new RegExp(`${NOMBRE}$`));
            if (t) delete estado.autoinc[limpiar(t[1]).toLowerCase()];
        }
        return { hecho: orden };
    }

    // Ejecuta todo un texto. Si una sentencia falla, se para ahí (como en phpMyAdmin)
    function ejecutar(db, texto, estado) {
        const resultados = [];
        for (const s of partirSentencias(texto)) {
            try {
                resultados.push({ sentencia: s, ...ejecutarSentencia(db, s, estado) });
            } catch (e) {
                resultados.push({ sentencia: s, error: e.message });
                break;
            }
        }
        return resultados;
    }

    // Funciones de MySQL que no tiene SQLite
    function anadirFunciones(db) {
        const fecha = v => {
            if (v === null || v === undefined) return null;
            const d = new Date(String(v).slice(0, 10) + "T00:00:00Z");
            return isNaN(d) ? null : d;
        };
        const hoy = () => new Date().toISOString().slice(0, 10);
        db.create_function("YEAR", v => fecha(v)?.getUTCFullYear() ?? null);
        db.create_function("MONTH", v => fecha(v) ? fecha(v).getUTCMonth() + 1 : null);
        db.create_function("DAY", v => fecha(v)?.getUTCDate() ?? null);
        db.create_function("DAYOFMONTH", v => fecha(v)?.getUTCDate() ?? null);
        db.create_function("CURDATE", hoy);
        db.create_function("NOW", () => new Date().toISOString().slice(0, 19).replace("T", " "));
        db.create_function("DATEDIFF", (a, b) => (fecha(a) && fecha(b)) ? Math.round((fecha(a) - fecha(b)) / 86400000) : null);
        db.create_function("UCASE", v => v === null ? null : String(v).toUpperCase());
        db.create_function("LCASE", v => v === null ? null : String(v).toLowerCase());
    }

    // Base de datos nueva con los datos de partida y el código "previo"
    function nuevaBD(SQL, datos, previo) {
        const db = new SQL.Database();
        const estado = { autoinc: {} };
        anadirFunciones(db);
        db.run("PRAGMA foreign_keys = ON");
        for (const [nombre, texto] of [["datos de partida", datos], ["código previo", previo]]) {
            if (!texto) continue;
            const fallo = ejecutar(db, texto, estado).find(r => r.error);
            if (fallo) throw new Error(`Error en ${nombre}: ${fallo.error} (${fallo.sentencia.slice(0, 60)})`);
        }
        return { db, estado };
    }

    /* ---------------------------- Comparar el resultado con la solución ---------------------------- */

    // Redondea a 2 decimales quitando antes el error de los decimales del ordenador
    // (26.9 * 1.15 da 30.934999... y 26.9 + 26.9 * 0.15 da 30.935000...: los dos tienen que dar 30.94)
    const redondear = n => Math.round(Math.round(n * 1e6) / 1e4) / 100;

    function normalizar(v) {
        if (v === null || v === undefined) return null;
        if (typeof v === "number") return redondear(v);
        const n = Number(v);
        if (typeof v === "string" && v.trim() !== "" && !isNaN(n)) return redondear(n);
        return String(v).trim().toLowerCase();
    }

    const ultimaTabla = resultados => [...resultados].reverse().find(r => r.columnas);

    // a: resultado del alumno, b: resultado de la solución
    function comparar(a, b, opciones) {
        if (!a) return { ok: false, mensaje: "Tu código no termina con una consulta que devuelva una tabla. Escribe al final la consulta SELECT que se pide." };
        if (a.columnas.length !== b.columnas.length) {
            return { ok: false, mensaje: `Tu consulta devuelve ${a.columnas.length} ${a.columnas.length === 1 ? "columna" : "columnas"} y deberían ser ${b.columnas.length}${opciones.estado ? "" : " (" + b.columnas.join(", ") + ")"}.` };
        }
        if (a.filas.length !== b.filas.length) {
            return { ok: false, mensaje: `Tu consulta devuelve ${a.filas.length} ${a.filas.length === 1 ? "fila" : "filas"} y deberían ser ${b.filas.length}.` };
        }
        const fa = a.filas.map(f => JSON.stringify(f.map(normalizar)));
        const fb = b.filas.map(f => JSON.stringify(f.map(normalizar)));
        const iguales = (x, y) => x.every((f, i) => f === y[i]);
        if (!iguales(fa, fb)) {
            if (!iguales([...fa].sort(), [...fb].sort())) {
                return { ok: false, mensaje: "Hay datos que no coinciden con los que se piden. Revisa las condiciones, los cálculos y el orden de las columnas." };
            }
            if (opciones.orden) return { ok: false, mensaje: "Las filas son las correctas, pero no están en el orden que se pide." };
        }
        if (opciones.columnas) {
            const na = a.columnas.map(c => c.trim().toLowerCase());
            const nb = b.columnas.map(c => c.trim().toLowerCase());
            if (!iguales(na, nb)) {
                return { ok: false, mensaje: `Los datos están bien, pero las columnas deben llamarse: ${b.columnas.join(", ")}.` };
            }
        }
        return { ok: true, mensaje: "¡Correcto!" };
    }

    function comprobar(SQL, datos, opciones) {
        const alumno = nuevaBD(SQL, datos.bd, datos.previo);
        const resAlumno = ejecutar(alumno.db, datos.codigo, alumno.estado);
        const fallo = resAlumno.find(r => r.error);
        if (fallo) {
            alumno.db.close();
            return { ok: false, mensaje: `Tu código da un error: ${traducirError(fallo.error).texto}` };
        }
        const ref = nuevaBD(SQL, datos.bd, datos.previo);
        const resRef = ejecutar(ref.db, datos.solucion, ref.estado);
        let a, b;
        if (datos.comprobar) {
            const resComprobar = ejecutar(alumno.db, datos.comprobar, alumno.estado);
            b = ultimaTabla(ejecutar(ref.db, datos.comprobar, ref.estado));
            const error = resComprobar.find(r => r.error);
            if (error && b) {
                alumno.db.close();
                ref.db.close();
                return { ok: false, mensaje: `La base de datos no ha quedado como se pide. ${traducirError(error.error).texto}` };
            }
            a = ultimaTabla(resComprobar);
        } else {
            a = ultimaTabla(resAlumno);
            b = ultimaTabla(resRef);
        }
        alumno.db.close();
        ref.db.close();
        if (!b) return { ok: false, mensaje: "No se ha podido comprobar (la solución no devuelve ninguna tabla)." };
        // El orden de las filas cuenta si la consulta que se compara lleva ORDER BY (en ESTRUCTURA, el orden de las columnas)
        const orden = opciones.orden !== undefined ? opciones.orden : datos.comprobar
            ? /\bORDER\s+BY\b|^\s*ESTRUCTURA\b/i.test(datos.comprobar) : /\bORDER\s+BY\b/i.test(datos.solucion);
        const r = comparar(a, b, { ...opciones, orden, estado: !!datos.comprobar });
        if (!r.ok && datos.comprobar) {
            r.mensaje = "La base de datos no ha quedado como se pide. Vuelve a leer el enunciado y mira cómo ha quedado con DESCRIBE tabla (la estructura) o SELECT * FROM tabla (los datos).";
        }
        return r;
    }

    /* -------------------------------------- Errores en castellano -------------------------------------- */

    function traducirError(msg) {
        const reglas = [
            [/no such table: (\S+)/, m => `No existe la tabla «${m[1]}». Revisa cómo se escribe (SHOW TABLES enseña las que hay).`],
            [/no such column: (\S+)/, m => `No existe la columna «${m[1]}». Revisa cómo se escribe (DESCRIBE tabla enseña sus columnas). Si es un texto, ponlo entre comillas simples: 'texto'.`],
            [/near "([^"]*)": syntax error/, m => `Hay un error de escritura cerca de «${m[1]}». Revisa las comas, los paréntesis, las comillas y el orden de las palabras.`],
            [/incomplete input/, () => "La sentencia está incompleta: falta cerrar un paréntesis o unas comillas, o falta una parte."],
            [/UNIQUE constraint failed: (\S+)/, m => `El valor de ${m[1]} está repetido. Es clave primaria o UNIQUE, así que no se puede repetir.`],
            [/NOT NULL constraint failed: (\S+)/, m => `${m[1]} no puede quedar vacía (es NOT NULL o clave primaria).`],
            [/FOREIGN KEY constraint failed/, () => "No se puede: rompería una clave ajena. O el valor no existe en la tabla a la que apunta, o hay filas de otra tabla que dependen de esta."],
            [/table "?([^"\s]+)"? already exists/, m => `La tabla ${m[1]} ya existe.`],
            [/duplicate column name: (\S+)/, m => `Ya hay una columna llamada ${m[1]}.`],
            [/Multiple primary key defined/, () => "La tabla ya tiene clave primaria. Una tabla solo puede tener una."],
            [/misuse of aggregate/, () => "COUNT, SUM, AVG, MAX y MIN no se pueden usar en el WHERE. Para poner una condición sobre ellas, usa HAVING después del GROUP BY."],
            [/a GROUP BY clause is required before HAVING/, () => "HAVING va después de un GROUP BY."],
            [/ambiguous column name: (\S+)/, m => `La columna «${m[1]}» está en las dos tablas. Pon delante el nombre de la tabla, por ejemplo: Tabla.${m[1].split(".").pop()}.`],
            [/no such function: (\S+)/, m => `El editor no conoce la función ${m[1]}.`],
            [/(\d+) values for (\d+) columns/, m => `Has puesto ${m[1]} valores para ${m[2]} columnas: tiene que haber uno por columna.`],
            [/table (\S+) has (\d+) columns but (\d+) values were supplied/, m => `La tabla ${m[1]} tiene ${m[2]} columnas y has puesto ${m[3]} valores. Pon uno por columna o indica entre paréntesis las columnas que rellenas.`],
            [/no such column: |no such table: /, () => ""],
        ];
        for (const [patron, texto] of reglas) {
            const m = msg.match(patron);
            if (m) return { texto: texto(m), original: msg };
        }
        return { texto: msg, original: null };
    }

    const Motor = { partirSentencias, nuevaBD, ejecutar, comprobar, comparar, traducirError };
    if (typeof module === "object" && module.exports) module.exports = Motor;
    if (typeof document === "undefined") return;

    /* ------------------------------------------------------------------------------------------------
     * INTERFAZ
     * ---------------------------------------------------------------------------------------------- */

    let promesaSQL = null;
    function cargarSQL() {
        if (!promesaSQL) {
            promesaSQL = new Promise((ok, mal) => {
                const s = document.createElement("script");
                s.src = CDN + "sql-wasm.js";
                s.onload = () => window.initSqlJs({ locateFile: f => CDN + f }).then(ok, mal);
                s.onerror = mal;
                document.head.appendChild(s);
            }).catch(e => { promesaSQL = null; throw e; });
        }
        return promesaSQL;
    }

    const bases = {};
    function cargarBase(nombre) {
        if (!nombre) return Promise.resolve("");
        if (!bases[nombre]) {
            bases[nombre] = fetch(`Unidad-6/bd/${nombre}.sql`).then(r => {
                if (!r.ok) throw new Error(`No se encuentra la base de datos «${nombre}»`);
                return r.text();
            }).catch(e => { delete bases[nombre]; throw e; });
        }
        return bases[nombre];
    }

    const escapar = v => String(v).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

    function celda(v) {
        if (v === null || v === undefined) return '<td class="nulo">NULL</td>';
        if (typeof v === "number") {
            const texto = Number.isInteger(v) ? String(v) : String(Math.round(v * 10000) / 10000);
            return `<td class="num">${texto}</td>`;
        }
        if (v instanceof Uint8Array) return "<td>(datos binarios)</td>";
        return `<td>${escapar(v)}</td>`;
    }

    function tablaHTML(r) {
        if (!r.filas.length) {
            return `<p class="sql-vacio">La consulta no devuelve ninguna fila (columnas: ${r.columnas.map(escapar).join(", ")}).</p>`;
        }
        return `<div class="sql-tabla-wrap"><table class="sql-tabla">
            <thead><tr>${r.columnas.map(c => `<th>${escapar(c)}</th>`).join("")}</tr></thead>
            <tbody>${r.filas.map(f => `<tr>${f.map(celda).join("")}</tr>`).join("")}</tbody></table></div>
            <p class="sql-pie">${r.filas.length} ${r.filas.length === 1 ? "fila" : "filas"}</p>`;
    }

    function resultadoHTML(r, numero, total) {
        const corta = r.sentencia.replace(/\s+/g, " ");
        const titulo = total > 1 ? `<p class="sql-sentencia"><span>${numero}</span><code>${escapar(corta.length > 90 ? corta.slice(0, 87) + "…" : corta)}</code></p>` : "";
        if (r.error) {
            const e = traducirError(r.error);
            return `${titulo}<div class="sql-error"><i class="bi bi-x-circle-fill"></i><div><strong>Error.</strong> ${escapar(e.texto)}`
                + (e.original ? `<small>Mensaje original: ${escapar(e.original)}</small>` : "") + "</div></div>";
        }
        if (r.aviso) return `${titulo}<p class="sql-aviso"><i class="bi bi-info-circle"></i>${escapar(r.aviso)}</p>`;
        if (r.columnas) return titulo + tablaHTML(r);
        const texto = r.afectadas !== undefined
            ? `${r.orden}: ${r.afectadas} ${r.afectadas === 1 ? "fila" : "filas"} ${{ INSERT: "insertada", REPLACE: "insertada", UPDATE: "modificada", DELETE: "borrada", TRUNCATE: "borrada" }[r.orden] || "afectada"}${r.afectadas === 1 ? "" : "s"}.`
            : `${r.hecho}: hecho.`;
        return `${titulo}<p class="sql-hecho"><i class="bi bi-check2"></i>${escapar(texto)}</p>`;
    }

    function textoScript(editor, clase) {
        const s = editor.querySelector(`script.${clase}`);
        return s ? s.textContent.replace(/^\n+|\s+$/g, "") : "";
    }

    function ajustarAltura(area) {
        area.style.height = "auto";
        area.style.height = `${area.scrollHeight + 2}px`;
    }

    function prepararEditor(editor, clave) {
        const area = editor.querySelector("textarea");
        if (!area || editor.dataset.listo) return;
        editor.dataset.listo = "1";
        const inicial = area.value.replace(/^\n+|\s+$/g, "");
        const solucion = textoScript(editor, "solucion");
        const datos = {
            bd: null, previo: textoScript(editor, "previo"), solucion, comprobar: textoScript(editor, "comprobar"),
        };
        const opciones = { columnas: editor.hasAttribute("data-columnas") };
        if (editor.dataset.orden) opciones.orden = editor.dataset.orden === "si";

        area.value = inicial;
        try { const g = localStorage.getItem(clave); if (g !== null) area.value = g; } catch (e) { }
        area.spellcheck = false;
        area.setAttribute("autocapitalize", "off");
        area.setAttribute("autocomplete", "off");
        area.setAttribute("aria-label", "Código SQL");
        area.classList.add("sql-codigo");

        const botones = document.createElement("div");
        botones.className = "sql-botones";
        botones.innerHTML = `
            <button type="button" class="btn btn-primary btn-sm" data-sql="ejecutar"><i class="bi bi-play-fill"></i> Ejecutar</button>
            ${solucion ? '<button type="button" class="btn btn-success btn-sm" data-sql="comprobar"><i class="bi bi-check2-circle"></i> Comprobar</button>' : ""}
            <button type="button" class="btn btn-outline-secondary btn-sm" data-sql="tablas"><i class="bi bi-table"></i> Ver tablas</button>
            <button type="button" class="btn btn-outline-secondary btn-sm" data-sql="reiniciar"><i class="bi bi-arrow-counterclockwise"></i> Empezar de nuevo</button>
            <span class="sql-atajo"><kbd>Ctrl</kbd> + <kbd>Intro</kbd> ejecuta</span>`;
        const salida = document.createElement("div");
        salida.className = "sql-salida";
        salida.setAttribute("aria-live", "polite");
        area.after(botones, salida);

        if (solucion) {
            const det = document.createElement("details");
            det.className = "sql-ver-solucion";
            det.innerHTML = '<summary>Ver la solución</summary><pre><code class="language-sql"></code></pre>';
            det.querySelector("code").textContent = solucion;
            editor.append(det);
            if (window.Prism) Prism.highlightElement(det.querySelector("code"));
        }

        const guardar = () => { try { localStorage.setItem(clave, area.value); } catch (e) { } };
        const ocupado = texto => { salida.innerHTML = `<p class="sql-cargando"><span class="spinner-border spinner-border-sm"></span>${texto}</p>`; };
        const listo = async () => {
            const [SQL, bd] = await Promise.all([cargarSQL(), cargarBase(editor.dataset.bd)]);
            datos.bd = bd;
            return SQL;
        };
        const fallo = e => {
            salida.innerHTML = `<div class="sql-error"><i class="bi bi-wifi-off"></i><div>No se ha podido preparar el editor. Comprueba la conexión a internet y vuelve a probar.<small>${escapar(e.message || e)}</small></div></div>`;
        };

        async function ejecutarCodigo() {
            ocupado("Ejecutando…");
            try {
                const SQL = await listo();
                const { db, estado } = nuevaBD(SQL, datos.bd, datos.previo);
                const res = ejecutar(db, area.value, estado);
                db.close();
                salida.innerHTML = res.length
                    ? res.map((r, i) => resultadoHTML(r, i + 1, res.length)).join("")
                    : '<p class="sql-aviso"><i class="bi bi-info-circle"></i>Escribe una sentencia SQL y pulsa Ejecutar.</p>';
            } catch (e) { fallo(e); }
        }

        async function comprobarCodigo() {
            ocupado("Comprobando…");
            try {
                const SQL = await listo();
                const r = comprobar(SQL, { ...datos, codigo: area.value }, opciones);
                salida.innerHTML = r.ok
                    ? `<div class="sql-correcto"><i class="bi bi-check-circle-fill"></i><div><strong>${escapar(r.mensaje)}</strong> Tu código hace lo que se pide.</div></div>`
                    : `<div class="sql-incorrecto"><i class="bi bi-exclamation-triangle-fill"></i><div><strong>Todavía no.</strong> ${escapar(r.mensaje)}</div></div>`;
            } catch (e) { fallo(e); }
        }

        async function verTablas() {
            ocupado("Cargando las tablas…");
            try {
                const SQL = await listo();
                const { db, estado } = nuevaBD(SQL, datos.bd, datos.previo);
                const tablas = ejecutar(db, "SHOW TABLES", estado)[0].filas.map(f => f[0]);
                if (!tablas.length) {
                    salida.innerHTML = '<p class="sql-aviso"><i class="bi bi-info-circle"></i>La base de datos está vacía: todavía no hay ninguna tabla.</p>';
                } else {
                    salida.innerHTML = `<p class="sql-aviso"><i class="bi bi-info-circle"></i>Así están las tablas al empezar (antes de tu código).</p>`
                        + tablas.map(t => {
                            const r = ejecutar(db, `SELECT * FROM "${t}"`, estado)[0];
                            return `<details class="sql-tabla-ver"><summary><strong>${escapar(t)}</strong> (${r.filas.length} filas): ${r.columnas.map(escapar).join(", ")}</summary>${tablaHTML(r)}</details>`;
                        }).join("");
                }
                db.close();
            } catch (e) { fallo(e); }
        }

        botones.addEventListener("click", e => {
            const b = e.target.closest("[data-sql]");
            if (!b) return;
            const accion = b.dataset.sql;
            if (accion === "ejecutar") ejecutarCodigo();
            else if (accion === "comprobar") comprobarCodigo();
            else if (accion === "tablas") verTablas();
            else if (accion === "reiniciar") {
                if (area.value !== inicial && !confirm("Se borrará lo que has escrito en este editor. ¿Seguro?")) return;
                area.value = inicial;
                try { localStorage.removeItem(clave); } catch (e) { }
                salida.innerHTML = "";
                ajustarAltura(area);
            }
        });

        area.addEventListener("keydown", e => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                ejecutarCodigo();
            } else if (e.key === "Tab" && !e.shiftKey) {
                e.preventDefault();
                area.setRangeText("    ", area.selectionStart, area.selectionEnd, "end");
                guardar();
            }
        });
        area.addEventListener("input", () => { ajustarAltura(area); guardar(); });
        ajustarAltura(area);
    }

    // Se llama cada vez que se carga una página (desde index.html)
    window.prepararEditoresSQL = function (contenedor, ruta) {
        const editores = contenedor.querySelectorAll(".sql-editor");
        editores.forEach((ed, i) => prepararEditor(ed, `ao-sql-${ruta}-${ed.id || i}`));
        if (editores.length) cargarSQL().catch(() => { });
    };

    // Si la página se cargó antes que este archivo (al abrir un enlace directo), se preparan ahora
    const contenido = document.getElementById("contenido");
    if (contenido && contenido.querySelector(".sql-editor")) {
        prepararEditoresSQL(contenido, location.hash.replace(/^#\/?/, "").split("?")[0]);
    }
})();
