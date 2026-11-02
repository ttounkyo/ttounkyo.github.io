-- ============================================================
-- Base de datos de práctica: AGENCIA DE VIAJES (Unidad 6)
-- Dos tablas: Destinos y Paquetes.
-- Para MySQL / phpMyAdmin: pestaña "Importar" y elige este archivo.
-- ============================================================

CREATE DATABASE IF NOT EXISTS AgenciaViajes CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci;
USE AgenciaViajes;

DROP TABLE IF EXISTS Paquetes;
DROP TABLE IF EXISTS Destinos;

CREATE TABLE Destinos (
    Codigo INT PRIMARY KEY,
    Nombre VARCHAR(100),
    Pais VARCHAR(50)
);

CREATE TABLE Paquetes (
    Codigo INT PRIMARY KEY,
    Nombre VARCHAR(150),
    Precio DECIMAL(10,2),
    DestinoID INT,
    FOREIGN KEY (DestinoID) REFERENCES Destinos(Codigo)
);

INSERT INTO Destinos (Codigo, Nombre, Pais) VALUES
(1, 'París', 'Francia'),
(2, 'Roma', 'Italia'),
(3, 'Nueva York', 'Estados Unidos'),
(4, 'Tokio', 'Japón'),
(5, 'Barcelona', 'España'),
(6, 'Cancún', 'México'),
(7, 'Londres', 'Reino Unido'),
(8, 'Bangkok', 'Tailandia'),
(9, 'Sidney', 'Australia'),
(10, 'Río de Janeiro', 'Brasil');

INSERT INTO Paquetes (Codigo, Nombre, Precio, DestinoID) VALUES
(1, 'Escapada romántica a París', 599.99, 1),
(2, 'Aventura en Roma', 499.99, NULL),
(3, 'Verano en Barcelona', 649.99, 5),
(4, 'Relax Premium en Cancún', 899.99, 6),
(5, 'Londres Cultural', 749.99, 7),
(6, 'Aventura en Bangkok', 829.99, 8),
(7, 'Sidney Explorador', 1249.99, 9),
(8, 'Carnaval en Río', 999.99, 10),
(9, 'París Descubrimiento', 549.99, 1),
(10, 'Tour histórico por Roma', 479.99, 2),
(11, 'París Premium', 799.99, 1),
(12, 'Escapada a Barcelona', 529.99, 5),
(13, 'Londres Premium', 999.99, 7),
(14, 'Aventura tropical en Cancún', 749.99, 6),
(15, 'Roma Clásica', 599.99, 2),
(16, 'París con tour Louvre', 659.99, 1),
(17, 'Playas de Barcelona', 439.99, 5),
(18, 'Semana en Bangkok', 779.99, 8);
