# Nerdsweek-Webapp
Diese Webapp dient dazu, das mehrtägige Brettspielevent Nerdsweek besser zu organiseren und zu planen. Künftig soll sie Aufgaben wie Anmeldung, Brettspielverwaltung und Erstellung von Plänen übernehmen.

![Startseite der Nerdsweek](/images/Startseite_Nerdsweek.png)

## Funktionen

### Anmeldung von Teilnehmenden zur Nerdsweek
Diejenigen, die an der nächsten Nerdsweek teilnehmen möchten, können sich über einen Klick auf den großen Nerdsweek-Banner-Button anmelden. Anschließend wird ein Formular angezeigt, in dem sie ihren Namen und ihre Spielpräferenzen angeben können.

### Verwaltung der Nerdsweek über den Adminbereich
Der Adminbereich ist nur mit passenden Zugangsdaten zu erreichen. Derzeit besteht ein Admin-Nutzerkonto.

Folgende Funktionen sind bereits implementiert:
- Verwaltung und Bearbeitung der Spieledatenbank
- Verwaltung und Bearbeitung der Teilnehmerliste
- Einsicht in Spielerpräferenzen und das daraus resultierendes Spieleranking
- Erste Implementierung eines Planungsalgorithmus, der durch viele Durchläufe den besten Plan mit den derzeit gegebenen Einstellungen findet und Unstimmigkeiten feststellt

![Admin-Bereich](/images/Adminbereich_Nerdsweek.png)

## Tech-Stack
- Frontend:
    - HTML
    - CSS
    - JavaScript
    - DOM API
- Backend:
    - Node.js
    - Express
    - JavaScript
- Datenbank:
    - MySQL
    - mysql2

## Architektur und technische Entscheidungen
- **Getrenntes Frontend und Backend:** Das Frontend kommuniziert über HTTP-Anfragen mit dem Express-Server.
- **MySQL als zentrale Datenhaltung:** Alle Änderungen werden dauerhaft in der Datenbank gespeichert.
- **Wiederverwendbare Komponenten:** Formulare und Tabellen werden durch allgemeine Funktionen erzeugt und für verschiedene Datenarten (z. B. Spiele und Teilnehmer) wiederverwendet.
- **Zentrale Datenverwaltung:** Gemeinsam genutzte Daten werden über ein zentrales Modul verwaltet, um Redundanzen zu vermeiden.
- **Asynchrone Datenbankzugriffe:** Die Kommunikation mit der Datenbank erfolgt über async/await.
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
```js
DB_HOST=localhost
DB_USER=[deinen Nutzernamen hier eingeben]
DB_PASSWORD=[dein Passwort hier festlegen]
DB_NAME=[deinen Datenbank-Namen hier hinterlegen]```

### Projekt starten
Starte im Projektverzeichnis folgenden Befehl:

```npm run dev```


Die benötigten MySQL-Tabellen müssen derzeit manuell erstellt werden. Eine kleine Hilfestellung dafür befindet sich in der Datei createTables.js im Projektverzeichnis. Welche Tabellen und Spalten aktuell benötigt werden, lässt sich insbesondere dem Code in /server/index.js entnehmen.

## Ausblick

### Geplante nächste Schritte
- Ausbau und Verbesserung des Planungsalgorithmus
- Ausbau des Anmeldebereichs um weitere Formularfelder wie E-Mail-Adresse, Zimmerwünsche usw.
- weitere Gestaltung der Seite mit CSS
- Personalisierte Links, über die Teilnehmende ihre Anmeldung bearbeiten können

### Mittelfristige Ziele
- Suchfunktion für die einzelnen Tabellen
- Umgestaltung der Anmeldeseite, sodass Spiele über Kacheln anwählbar sind
- Verbesserung der Fehlerhandhabung
- Implementierung eines Rollen- und Rechtemanagement
- Verbesserung der Datensicherheit
– Optisch ansprechende individuelle Gestaltung der Website

### Langfristige Ideen
- Möglichkeit der Personalisierung des Anmeldebereichs über den Adminbereich
- Anlegen mehrerer getrennter Events mit jeweils eigener Verwaltung
- Neugestaltung des Admin-Bereichs im Frontend mittels CSS