-- ============================================================
-- Base de datos de práctica: TIENDA DE INFORMÁTICA (Unidad 6)
-- Dos tablas: Fabricante y Articulos.
-- Para MySQL / phpMyAdmin: pestaña "Importar" y elige este archivo.
-- ============================================================

CREATE DATABASE IF NOT EXISTS tienda CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci;
USE tienda;

DROP TABLE IF EXISTS Articulos;
DROP TABLE IF EXISTS Fabricante;

CREATE TABLE Fabricante (
    Codigo INT PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL
);

CREATE TABLE Articulos (
    Codigo INT PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    Precio DECIMAL(8,2),
    Fabricante INT,
    FOREIGN KEY (Fabricante) REFERENCES Fabricante(Codigo)
);

INSERT INTO Fabricante (Codigo, Nombre) VALUES
(1, 'Nokia'),
(2, 'Xiaomi'),
(3, 'Alcatel'),
(4, 'MSI'),
(5, 'Samsung'),
(6, 'Apple'),
(7, 'Lenovo'),
(8, 'HP'),
(9, 'Logitech'),
(10, 'Sony');

INSERT INTO Articulos (Codigo, Nombre, Precio, Fabricante) VALUES
(1, 'Nokia Lumia Pro 950', 299.99, 1),
(2, 'Nokia G21', 149.99, 1),
(3, 'Xiaomi Mi 11', 749.99, 2),
(4, 'Xiaomi Redmi Note 11', 229.99, 2),
(5, 'Xiaomi Pad 6', 399.99, 2),
(6, 'Portátil MSI Modern 14', 649.00, 4),
(7, 'Portátil MSI Katana 15', 1199.00, 4),
(8, 'Portátil MSI Raider GE78', 2499.00, 4),
(9, 'Monitor MSI Pro MP241', 139.90, 4),
(10, 'Ratón MSI Clutch GM11', 29.99, 4),
(11, 'Placa base MSI B550', 159.90, 4),
(12, 'Samsung Galaxy S23', 899.00, 5),
(13, 'Samsung Galaxy Tab S9', 949.00, 5),
(14, 'Disco SSD Samsung 990 Pro 1TB', 119.99, 5),
(15, 'iPhone 15', 959.00, 6),
(16, 'MacBook Air 13', 1199.00, 6),
(17, 'MacBook Pro 16', 2899.00, 6),
(18, 'Lenovo IdeaPad 3', 499.00, 7),
(19, 'Lenovo ThinkPad E14', 899.00, 7),
(20, 'Lenovo Legion 5 Pro', 1799.00, 7),
(21, 'Impresora HP DeskJet 2720', 59.99, 8),
(22, 'Portátil HP 15s', 549.00, 8),
(23, 'HP Pavilion Gaming', 899.00, 8),
(24, 'Monitor HP M24f', 129.00, 8),
(25, 'Teclado HP 150', 19.99, 8),
(26, 'Ratón HP X200', 12.99, 8),
(27, 'Ratón Logitech M185', 14.99, 9),
(28, 'Teclado Logitech K120', 16.99, 9),
(29, 'Webcam Logitech C920', 69.99, 9),
(30, 'Cable HDMI 2 m', 9.99, NULL),
(31, 'Alfombrilla de ratón XL', 14.50, NULL);
