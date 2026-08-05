# Nerdsweek-Webapp
Diese Webapp dient dazu, das mehrtägige Brettspielevent Nerdsweek besser organiseren und planen zu können. Dabei wird es in Zukunft viele Aufgaben wie Anmeldung, Brettspielverwaltung und Erstellung von Plänen übernehmen.

## Funktionen

### Einmalige Anmeldung von Teilnehmern zur Nerdsweek
Diejenigen, die an der nächsten Nerdsweek teilnehmen wollen, können sich über den Botton "Zur Anmeldung" anmelden. Es wird ein Formular angezeigt, in das sie ihren Namen und ihre Spielpräferenzen angeben können.

### Verwaltung der Nerdsweek über den Adminbereich
Der Adminbereich ist nur mit passenden Zugangsdaten zu erreichen. Derzeit besteht ein Admin-Nutzerkonto. Außerdem sind bereits folgende Funktionen implementiert:
- Verwaltung und Bearbeitung der Spieledatenbank
- Verwaltung und Bearbeitung der Teilnehmerliste
- Einsicht in Spielerpräferenzen und daraus resultierendes Spieleranking
- Erste Implementierung eines Planungsalgorithmus, der über viele Durchläufe den besten Plan mit den derzeit gegebenen Einstellungen findet und Unstimmigkeiten feststellt

## Tech-Stack
- Frontend:
    - HTML
    - Javascript
    - DOM-API
- Backend:
    - Node.js
    - Express
    - Javascript
- Datenbank:
    - MySQL
    - mysql2

## Architektur und technische Entscheidungen
- **Frontend und Backend sind getrennt.** Das Frontend kommuniziert über HTTP-Anfragen mit dem Express-Server.
- **MySQL dient als zentrale Datenhaltung.** Alle Änderungen werden dauerhaft in der Datenbank gespeichert.
- **Wiederverwendbare Komponenten.** Formulare und Tabellen werden durch allgemeine Funktionen erzeugt und für verschiedene Datenarten (z. B. Spiele und Teilnehmer) wiederverwendet.
- **Zentrale Datenverwaltung.** Gemeinsam genutzte Daten werden über ein zentrales Modul verwaltet, um Redundanzen zu vermeiden.
- **Asynchrone Datenbankzugriffe.** Die Kommunikation mit der Datenbank erfolgt über async/await.
## Lokal starten

### Voraussetzungen
- Node.js
- MySQL

### Installation
1. Repository klonen
2. Abhängigkeiten installieren
```npm install```
3. eine MySQL-Datenbank anlegen
4. eine `.env`-Datei im Projektverzeichnis erstellen

### Inhalt der .env
```DB_HOST=localhost```
```DB_USER=[deinen Nutzernamen hier eingeben]```
```DB_PASSWORD=[dein Passwort hier festlegen]```
```DB_NAME=[deinen Datenbank-Namen hier hinterlegen]```

### Projekt starten
Starte den Befehl
```npm run dev```
in deinem Projektverzeichnis.
Die benötigten mySQL-Tabellen müssen derzeit händisch erstellt werden. Eine kleine Hilfe dafür findet sich in der Datei createTables.js im Projektverzeichnis. Welche Tabellen und Spalten aktuell benötigt werden, kann vor allem dem Code aus /server/index.js entnommen werden.

## Ausblick

### Geplante nächste Schritte
- Umgestaltung der Startseite und der Anmeldeseite, um optisch ansprechender zu sein.
- Verbesserung der Lesbarkeit der Tabellen im Adminbereich mittels CSS
- Ausbau und Verbesserung des Planungsalgorithmus
- Ausbau des Anmeldebereichs für Teilnehmer um weitere Formularfelder wie E-Mail-Adresse, Zimmerwünsche usw.
- Personalisierte Links, die es einem Teilnehmer ermöglichen, seine Anmeldung zu bearbeiten

### Mittelfristige Ziele
- Verbesserung der Fehlerhandhabung
- Implementierung von Rollen- und Rechtemanagement
- Verbesserung der Datensicherheit

### Langfristige Ideen
- Möglichkeit der Personalisierung des Anmeldebereichs über den Adminbereich
- Anlegen von mehreren getrennten Events mit jeweils eigener Verwaltung
- Neugestaltung des Admin-Bereichs im Frontend mittels CSS