# Pendiente

## Hecho en la fase 6 (23 nov 2026)

- **Claude lee los PDF**: el texto se saca al subir el archivo (unpdf, o Gemini si está escaneado), se guarda en `study_files.content_md` y Claude lo lee con la herramienta `leer_archivo` del MCP, por trozos.
- **Método de estudio con boletines**: Claude guarda los tipos de ejercicio, la guía de cada tipo y las tandas de práctica. Las tandas se hacen en la app, con la pista y la solución ocultas, y con un 80 % de aciertos el tipo queda dominado. Gemini queda como reserva, con botones en la app. Detalles en CLAUDE.md, sección "Estudiar con Claude".

## Antes de usarlo

1. Ejecutar la migración `supabase/migrations/20261123000000_fase6.sql` en Supabase.
2. Desplegar. Los archivos que ya estaban subidos se leen la primera vez que Claude los pide, o con el botón ↻ de cada archivo.
3. En claude.ai, reconectar el conector de root (o abrir un chat nuevo) para que aparezcan las herramientas nuevas.

## Ideas para más adelante

- **PDF original para Claude** (opción A): probar si claude.ai acepta el PDF incrustado en el resultado de una herramienta MCP. Así Claude vería las imágenes y los dibujos, no solo el texto.
- **Hoy**: mostrar "Toca practicar: tipo X" para el tema prioritario.
- **Flashcards de los fallos**: convertir los ejercicios fallados en flashcards con un botón.
