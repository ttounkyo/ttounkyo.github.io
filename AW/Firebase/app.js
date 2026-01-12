// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    doc,
    deleteDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCcTtP0llSZ1MOfXZ_ziJK-1a_4yg7XMmg",
    authDomain: "crud-peliculas-453bb.firebaseapp.com",
    projectId: "crud-peliculas-453bb",
    storageBucket: "crud-peliculas-453bb.firebasestorage.app",
    messagingSenderId: "882966773966",
    appId: "1:882966773966:web:550b039a378f916bcf109f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const db = getFirestore(app); // Inicialitza Firestore

// Referències als elements del DOM
const movieForm = document.getElementById('movie-form');
const movieList = document.getElementById('movie-list');

let moviesData = {}; // <-- AFEGEIX AQUESTA LÍNIA. Guardarem les dades aquí.
let currentMovieId = null; // Variable per saber si estem editant o creant
// READ (en temps real)
onSnapshot(collection(db, 'movies'), (querySnapshot) => {
    movieList.innerHTML = ''; // Buidem la llista
    moviesData = {}; // Buidem l'objecte de dades

    querySnapshot.forEach((doc) => {
        const movie = doc.data();
        const movieID = doc.id;

        // Guardem les dades completes a la nostra variable
        moviesData[movieID] = movie;

        const li = document.createElement('li');
        li.innerHTML = `
            <span>${movie.title} (${movie.year || 'Any desconegut'}) - <em>${movie.genre || 'Gènere desconegut'}</em></span>
            <div class="buttons">
                <button class="edit-btn" data-id="${movieID}">Editar</button>
                <button class="delete-btn" data-id="${movieID}">Esborrar</button>
            </div>
        `;
        movieList.appendChild(li);
    });
});

// DELETE & UPDATE (mitjançant delegació d'esdeveniments)
movieList.addEventListener('click', async (e) => {
    const movieID = e.target.dataset.id;

    // DELETE
    if (e.target.matches('.delete-btn')) {
        if (confirm('Estàs segur que vols esborrar aquesta pel·lícula?')) {
            const movieDocRef = doc(db, 'movies', movieID);
            await deleteDoc(movieDocRef);
            console.log('Pel·lícula esborrada:', movieID);
        }
    }

    // UPDATE (Part 1: carregar dades al formulari)
    if (e.target.matches('.edit-btn')) {
        // Obtenim les dades directament de la nostra variable, no de l'HTML!
        const movieToEdit = moviesData[movieID];

        if (movieToEdit) {
            // Omplim el formulari amb les dades netes
            movieForm['movie-title'].value = movieToEdit.title;
            movieForm['movie-year'].value = movieToEdit.year;
            movieForm['movie-genre'].value = movieToEdit.genre;

            // Guardem l'ID per saber que estem editant
            currentMovieId = movieID;

            // Canviem el text del botó per indicar que estem editant
            movieForm.querySelector('button[type="submit"]').textContent = 'Actualitzar Pel·lícula';
        }
    }
});
