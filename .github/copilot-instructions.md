este proyecto debe ser siempre un proyecto de ejemplo que tenga tres subproyectos:
- un proyecto shell que hace de host o principal
- un proyecto plugin_tracks, que es un módulo opcional del primero
- un proyecto plugin_tactical_objects, que es otro módulo opcional del primero
- una librería común que es usada por ambos proyectos anteriores

Debe usarse module federation para compartir código entre el proyecto shell y el proyecto plugin_tracks, de modo que el plugin_tracks pueda ser cargado dinámicamente por el shell en tiempo de ejecución.

No debe haber dependencias directas entre el proyecto shell, el proyecto plugin_tactical_objects y el proyecto plugin_tracks, sino que la comunicación entre ambos debe realizarse a través de interfaces definidas en la librería común.

El proyecto debe estar estructurado de manera que cada subproyecto tenga su propio directorio raíz, con su propio archivo de configuración (por ejemplo, package.json) y su propio código fuente.

El proyecto debe incluir un archivo README.md en la raíz del proyecto que explique cómo configurar y ejecutar el proyecto, así como una descripción general de la arquitectura y las tecnologías utilizadas.

El proyecto debe estar configurado para usar TypeScript como lenguaje de programación, y debe incluir un archivo tsconfig.json en cada subproyecto para configurar las opciones de compilación de TypeScript.

El proyecto debe incluir un sistema de construcción (por ejemplo, usando Webpack o similar) que permita compilar y empaquetar cada subproyecto de manera independiente, así como un script para iniciar el proyecto shell y cargar el plugin_tracks.
