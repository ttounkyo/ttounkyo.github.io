-- ============================================================
-- Base de datos de práctica: BIBLIOTECA ESCOLAR (Unidad 6)
-- Dos tablas: Autor y Libros.
-- Para MySQL / phpMyAdmin: pestaña "Importar" y elige este archivo.
-- ============================================================

CREATE DATABASE IF NOT EXISTS BibliotecaEscolar CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci;
USE BibliotecaEscolar;

DROP TABLE IF EXISTS Libros;
DROP TABLE IF EXISTS Autor;

CREATE TABLE Autor (
    Codigo INT PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL
);

CREATE TABLE Libros (
    Codigo INT PRIMARY KEY,
    Titulo VARCHAR(150) NOT NULL,
    Precio DECIMAL(6,2),
    Autor INT,
    FOREIGN KEY (Autor) REFERENCES Autor(Codigo)
);

INSERT INTO Autor (Codigo, Nombre) VALUES
(1, 'Miguel de Cervantes'),
(2, 'Federico García Lorca'),
(3, 'Isabel Allende'),
(4, 'J. K. Rowling'),
(5, 'Carlos Ruiz Zafón'),
(6, 'Gabriel García Márquez'),
(7, 'Laura Gallego'),
(8, 'Elvira Lindo');

INSERT INTO Libros (Codigo, Titulo, Precio, Autor) VALUES
(1, 'Don Quijote de la Mancha', 19.99, 1),
(2, 'Novelas ejemplares', 12.50, 1),
(3, 'La Galatea', 9.95, 1),
(4, 'Bodas de sangre', 8.95, 2),
(5, 'La casa de Bernarda Alba', 8.50, 2),
(6, 'Romancero gitano', 7.95, 2),
(7, 'Harry Potter 1', 24.99, NULL),
(8, 'Harry Potter y la piedra filosofal', 18.90, 4),
(9, 'Harry Potter y la cámara secreta', 18.90, 4),
(10, 'Harry Potter y el prisionero de Azkaban', 19.90, 4),
(11, 'Harry Potter y el cáliz de fuego', 24.90, 4),
(12, 'Harry Potter y la Orden del Fénix', 26.90, 4),
(13, 'Harry Potter y el misterio del príncipe', 24.90, 4),
(14, 'Harry Potter y las reliquias de la Muerte', 26.90, 4),
(15, 'La sombra del viento', 21.90, 5),
(16, 'El juego del ángel', 22.90, 5),
(17, 'Marina', 11.95, 5),
(18, 'Cien años de soledad', 22.95, 6),
(19, 'Crónica de una muerte anunciada', 9.95, 6),
(20, 'El amor en los tiempos del cólera', 34.90, 6),
(21, 'Memorias de Idhún', 29.95, 7),
(22, 'Donde los árboles cantan', 17.95, 7),
(23, 'Finis Mundi', 10.95, 7),
(24, 'Antología de poesía', 6.50, NULL);
