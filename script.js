document.addEventListener('DOMContentLoaded', () => {
    const anchoInput = document.getElementById('ancho');
    const altoInput = document.getElementById('alto');
    const generarBtn = document.getElementById('generarBtn');
    const container = document.getElementById('laberinto-container');
    const anclarCheckbox = document.getElementById('anclarDimensiones');
    const resolverBtn = document.getElementById('resolverBtn');
    const velocidadSlider = document.getElementById('velocidadSlider');
    const velocidadValor = document.getElementById('velocidadValor');
    const descargarBtn = document.getElementById('descargarBtn');

    // Variables para guardar los valores anteriores
    let ultimoAncho = anchoInput.value;
    let ultimoAlto = altoInput.value;

    function sincronizarDesdeAncho() {
        if (anclarCheckbox.checked) {
            altoInput.value = anchoInput.value;
        }
        ultimoAncho = anchoInput.value;
    }

    function sincronizarDesdeAlto() {
        if (anclarCheckbox.checked) {
            anchoInput.value = altoInput.value;
        }
        ultimoAlto = altoInput.value;
    }

    anchoInput.addEventListener('input', sincronizarDesdeAncho);
    altoInput.addEventListener('input', sincronizarDesdeAlto);
    
    // Restaurar valores cuando el input pierde el foco
    anchoInput.addEventListener('blur', function() {
        if (!anclarCheckbox.checked && this.value !== ultimoAncho) {
            generarLaberinto();
        }
    });
    
    altoInput.addEventListener('blur', function() {
        if (!anclarCheckbox.checked && this.value !== ultimoAlto) {
            generarLaberinto();
        }
    });

    generarBtn.addEventListener('click', generarLaberinto);
    resolverBtn.addEventListener('click', resolverLaberinto);
    velocidadSlider.addEventListener('input', () => {
        velocidadValor.textContent = `${velocidadSlider.value} ms`;
    });
    descargarBtn.addEventListener('click', descargarImagenes);

    let matriz = [];
    let pila = [];
    let anchoSolicitado, altoSolicitado;
    let anchoTotal, altoTotal;
    let resolviendo = false;
    let dibujando = false;
    let celdasVisitadas = new Set();
    let mapaDependencias = new Map();

    function generarLaberinto() {
        resolviendo = false;
        dibujando = false;
        resolverBtn.disabled = false;
        generarBtn.disabled = false;
        celdasVisitadas.clear();
        mapaDependencias.clear();
        
        const celdasCamino = document.querySelectorAll('.celda.camino, .celda.usuario');
        celdasCamino.forEach(c => {
            c.classList.remove('camino');
            c.classList.remove('usuario');
        });

        const MIN_DIM = 10;
        const MAX_DIM = 100;

        let anchoVal = parseInt(anchoInput.value) || MIN_DIM;
        let altoVal = parseInt(altoInput.value) || MIN_DIM;

        anchoVal = Math.max(MIN_DIM, Math.min(MAX_DIM, anchoVal));
        altoVal = Math.max(MIN_DIM, Math.min(MAX_DIM, altoVal));

        anchoInput.value = anchoVal;
        altoInput.value = altoVal;
        
        anchoSolicitado = anchoVal;
        altoSolicitado = altoVal;

        anchoTotal = anchoSolicitado * 2 + 1;
        altoTotal = altoSolicitado * 2 + 1;
        
        container.innerHTML = '';
        matriz = [];
        pila = [];
        celdasVisitadas.clear();
        mapaDependencias.clear();

        const porcentajeAncho = 0.9;
        const porcentajeAlto = 0.80;
        
        const anchoDisponible = window.innerWidth * porcentajeAncho;
        const altoDisponible = (window.innerHeight - 200) * porcentajeAlto;

        const tamanoCeldaHorizontal = anchoDisponible / anchoTotal;
        const tamanoCeldaVertical = altoDisponible / altoTotal;
        
        let tamanoCelda = Math.min(tamanoCeldaHorizontal, tamanoCeldaVertical);
        
        tamanoCelda = Math.max(2, tamanoCelda);

        container.style.gridTemplateColumns = `repeat(${anchoTotal}, ${tamanoCelda}px)`;
        container.style.gridAutoRows = `${tamanoCelda}px`;

        container.style.width = `${anchoTotal * tamanoCelda}px`;
        container.style.height = `${altoTotal * tamanoCelda}px`;
        container.style.overflow = 'hidden';

        for (let i = 0; i < altoTotal; i++) {
            const fila = [];
            for (let j = 0; j < anchoTotal; j++) {
                const celdaDOM = document.createElement('div');
                celdaDOM.classList.add('celda');
                celdaDOM.classList.add('muro'); 
                
                celdaDOM.addEventListener('mousedown', manejarMouseDown);
                celdaDOM.addEventListener('mouseenter', manejarMouseEnter);
                celdaDOM.addEventListener('mouseup', manejarMouseUp);
                
                container.appendChild(celdaDOM);
                
                fila.push({
                    fila: i,
                    col: j,
                    tipo: 1, 
                    visitado: false,
                    domElement: celdaDOM,
                    usuarioVisitado: false
                });
            }
            matriz.push(fila);
        }

        let celdaActual = matriz[1][1];
        celdaActual.tipo = 0;
        celdaActual.visitado = true;
        celdaActual.domElement.classList.remove('muro');
        pila.push(celdaActual);

        while (pila.length > 0) {
            celdaActual = pila[pila.length - 1];
            let vecinos = obtenerVecinosNoVisitados(celdaActual);

            if (vecinos.length > 0) {
                const vecinaElegida = vecinos[Math.floor(Math.random() * vecinos.length)];
                conectarCeldas(celdaActual, vecinaElegida);
                    
                vecinaElegida.tipo = 0;
                vecinaElegida.visitado = true;
                vecinaElegida.domElement.classList.remove('muro');
                pila.push(vecinaElegida);
            } else {
                pila.pop();
            }
        }

        ultimoAncho = anchoInput.value;
        ultimoAlto = altoInput.value;
        
        marcarInicioYFin();
        iniciarCeldaInicio();
    }

    function manejarMouseDown(event) {
        if (resolviendo) return;
        
        const celda = encontrarCeldaDesdeElemento(event.target);
        if (celda && celda.tipo === 0 && !celda.domElement.classList.contains('muro')) {
            dibujando = true;
            if (celda.domElement.classList.contains('usuario') && !celda.domElement.classList.contains('inicio')) {
                deseleccionarCeldaYHijos(celda);
            } else {
                if (esCeldaValidaParaUsuario(celda)) {
                    seleccionarCelda(celda);
                }
            }
        }
    }

    function manejarMouseEnter(event) {
        if (!dibujando || resolviendo) return;
        
        const celda = encontrarCeldaDesdeElemento(event.target);
        if (celda && celda.tipo === 0 && !celda.domElement.classList.contains('muro')) {
            if (celda.domElement.classList.contains('usuario') && !celda.domElement.classList.contains('inicio')) {
                deseleccionarCeldaYHijos(celda);
            } else {
                if (!celda.domElement.classList.contains('usuario') && esCeldaValidaParaUsuario(celda)) {
                    seleccionarCelda(celda);
                }
            }
        }
    }

    function manejarMouseUp() {
        dibujando = false;
        verificarVictoria();
    }

    function encontrarCeldaDesdeElemento(elemento) {
        for (let i = 0; i < altoTotal; i++) {
            for (let j = 0; j < anchoTotal; j++) {
                if (matriz[i][j].domElement === elemento) {
                    return matriz[i][j];
                }
            }
        }
        return null;
    }

    function seleccionarCelda(celda) {
        const vecinos = obtenerVecinosValidos(celda);
        let celdaPadre = null;
        
        for (const vecino of vecinos) {
            if (vecino.usuarioVisitado) {
                celdaPadre = vecino;
                break;
            }
        }
        
        if (celdaPadre || celda.domElement.classList.contains('inicio')) {
            celda.domElement.classList.add('usuario');
            celda.usuarioVisitado = true;
            celdasVisitadas.add(celda);
            
            if (celdaPadre) {
                mapaDependencias.set(celda, celdaPadre);
            }
            
            verificarVictoria();
        }
    }

    function deseleccionarCeldaYHijos(celda) {
        const celdasAEliminar = obtenerTodasLasDependencias(celda);
        
        for (const celdaAEliminar of celdasAEliminar) {
            celdaAEliminar.domElement.classList.remove('usuario');
            celdaAEliminar.usuarioVisitado = false;
            celdasVisitadas.delete(celdaAEliminar);
            mapaDependencias.delete(celdaAEliminar);
        }
    }

    function obtenerTodasLasDependencias(celda) {
        const resultado = new Set([celda]);
        const porProcesar = [celda];
        
        while (porProcesar.length > 0) {
            const actual = porProcesar.pop();
            
            for (const [hijo, padre] of mapaDependencias.entries()) {
                if (padre === actual) {
                    resultado.add(hijo);
                    porProcesar.push(hijo);
                }
            }
        }
        
        return Array.from(resultado);
    }

    function esCeldaValidaParaUsuario(celda) {
        if (celda.domElement.classList.contains('inicio')) return true;
        
        const vecinos = obtenerVecinosValidos(celda);
        for (const vecino of vecinos) {
            if (vecino.usuarioVisitado) {
                return true;
            }
        }
        return false;
    }

    function iniciarCeldaInicio() {
        const inicio = matriz[1][1];
        inicio.usuarioVisitado = true;
        celdasVisitadas.add(inicio);
    }

    function verificarVictoria() {
        const fin = matriz[altoTotal - 2][anchoTotal - 2];
        if (fin.usuarioVisitado) {
            setTimeout(() => {
                alert('¡Felicidades! Has resuelto el laberinto.');
                dibujando = false;
            }, 100);
        }
    }

    function obtenerVecinosNoVisitados(celda) {
        const { fila, col } = celda;
        const vecinos = [];

        if (fila > 1 && !matriz[fila - 2][col].visitado) {
            vecinos.push(matriz[fila - 2][col]);
        }
        if (col < anchoTotal - 2 && !matriz[fila][col + 2].visitado) {
            vecinos.push(matriz[fila][col + 2]);
        }
        if (fila < altoTotal - 2 && !matriz[fila + 2][col].visitado) {
            vecinos.push(matriz[fila + 2][col]);
        }
        if (col > 1 && !matriz[fila][col - 2].visitado) {
            vecinos.push(matriz[fila][col - 2]);
        }
        return vecinos;
    }

    function conectarCeldas(actual, vecina) {
        const filaMedia = (actual.fila + vecina.fila) / 2;
        const colMedia = (actual.col + vecina.col) / 2;
        
        const celdaMedia = matriz[filaMedia][colMedia];
        celdaMedia.tipo = 0;
        celdaMedia.domElement.classList.remove('muro');
    }

    function marcarInicioYFin() {
        const inicio = matriz[1][1];
        inicio.domElement.classList.add('inicio');

        const fin = matriz[altoTotal - 2][anchoTotal - 2];
        fin.domElement.classList.add('fin');
    }

    function resolverLaberinto() {
        if (resolviendo) return;
        resolviendo = true;
        dibujando = false;
        generarBtn.disabled = true;
        resolverBtn.disabled = true;

        const celdasUsuario = document.querySelectorAll('.celda.usuario');
        celdasUsuario.forEach(c => c.classList.remove('usuario'));
        celdasVisitadas.clear();
        mapaDependencias.clear();

        const camino = encontrarCaminoBFS();

        if (camino.length > 0) {
            animarCamino(camino);
        } else {
            alert("No se encontró solución.");
            resolviendo = false;
            generarBtn.disabled = false;
            resolverBtn.disabled = false;
        }
    }

    function encontrarCaminoBFS() {
        const inicio = matriz[1][1];
        const fin = matriz[altoTotal - 2][anchoTotal - 2];

        const cola = [inicio];
        const visitados = new Set();
        const mapaPadres = new Map();

        visitados.add(inicio);
        mapaPadres.set(inicio, null);

        let pathFound = false;

        while (cola.length > 0) {
            const actual = cola.shift();

            if (actual === fin) {
                pathFound = true;
                break;
            }

            const vecinos = obtenerVecinosValidos(actual);
            for (const vecino of vecinos) {
                if (!visitados.has(vecino)) {
                    visitados.add(vecino);
                    mapaPadres.set(vecino, actual);
                    cola.push(vecino);
                }
            }
        }

        const caminoCorrecto = [];
        if (pathFound) {
            let temp = fin;
            while (temp !== null) {
                caminoCorrecto.push(temp);
                temp = mapaPadres.get(temp);
            }
            caminoCorrecto.reverse();
        }
        return caminoCorrecto;
    }

    function obtenerVecinosValidos(celda) {
        const { fila, col } = celda;
        const vecinos = [];

        if (fila > 0 && matriz[fila - 1][col].tipo === 0) {
            vecinos.push(matriz[fila - 1][col]);
        }
        if (fila < altoTotal - 1 && matriz[fila + 1][col].tipo === 0) {
            vecinos.push(matriz[fila + 1][col]);
        }
        if (col > 0 && matriz[fila][col - 1].tipo === 0) {
            vecinos.push(matriz[fila][col - 1]);
        }
        if (col < anchoTotal - 1 && matriz[fila][col + 1].tipo === 0) {
            vecinos.push(matriz[fila][col + 1]);
        }
        return vecinos;
    }

    function animarCamino(camino) {
        let i = 0;

        function siguientePaso() {
            if (i >= camino.length) {
                alert('¡Solucionado!');
                generarBtn.disabled = false;
                resolverBtn.disabled = false;
                resolviendo = false;
                return;
            }

            const celda = camino[i];
            if (!celda.domElement.classList.contains('inicio') &&
                !celda.domElement.classList.contains('fin')) {
                celda.domElement.classList.add('camino');
            }
            
            i++;

            const area = anchoSolicitado * altoSolicitado;
            const factorVelocidad = Math.max(0.1, Math.min(1, 1000 / area));
            const velocidadUsuario = parseInt(velocidadSlider.value);
            const delay = Math.max(1, Math.floor(velocidadUsuario * factorVelocidad));

            setTimeout(siguientePaso, delay);
        }

        siguientePaso();
    }

    async function descargarImagenes() {
        descargarBtn.disabled = true;
        descargarBtn.textContent = 'Generando...';
        
        try {
            const canvasNormal = await crearCanvasLaberinto(false);
            const urlNormal = canvasNormal.toDataURL('image/png');
            
            descargarURL(urlNormal, 'laberinto.png');
            
            alert('¡Imagen descargada correctamente!');
            
        } catch (error) {
            console.error('Error al generar imagen:', error);
            alert('Error al generar la imagen');
        } finally {
            descargarBtn.disabled = false;
            descargarBtn.textContent = 'Descargar Imagen';
        }
    }

    function crearCanvasLaberinto(conSolucion = false) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const TAMANO_IMAGEN = 4000;
            canvas.width = TAMANO_IMAGEN;
            canvas.height = TAMANO_IMAGEN;
            
            const tamanoCelda = TAMANO_IMAGEN / anchoTotal;
            
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, TAMANO_IMAGEN, TAMANO_IMAGEN);
            
            ctx.imageSmoothingEnabled = false;
            
            for (let i = 0; i < altoTotal; i++) {
                for (let j = 0; j < anchoTotal; j++) {
                    const celda = matriz[i][j];
                    const x = Math.floor(j * tamanoCelda);
                    const y = Math.floor(i * tamanoCelda);
                    const ancho = Math.ceil(tamanoCelda);
                    const alto = Math.ceil(tamanoCelda);
                    
                    if (celda.tipo === 1) {
                        ctx.fillStyle = '#111111';
                        ctx.fillRect(x, y, ancho, alto);
                    } else {
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(x, y, ancho, alto);
                        
                        if (conSolucion && (celda.domElement.classList.contains('camino') || celda.domElement.classList.contains('usuario'))) {
                            ctx.fillStyle = '#68d16b';
                            const margen = Math.max(1, tamanoCelda * 0.2);
                            ctx.fillRect(x + margen, y + margen, ancho - margen * 2, alto - margen * 2);
                        }
                        
                        if (celda.domElement.classList.contains('inicio')) {
                            ctx.fillStyle = '#4CAF50';
                            const margen = Math.max(1, tamanoCelda * 0.3);
                            ctx.fillRect(x + margen, y + margen, ancho - margen * 2, alto - margen * 2);
                        }
                        
                        if (celda.domElement.classList.contains('fin')) {
                            ctx.fillStyle = '#f44336';
                            const margen = Math.max(1, tamanoCelda * 0.3);
                            ctx.fillRect(x + margen, y + margen, ancho - margen * 2, alto - margen * 2);
                        }
                    }
                }
            }
            
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 3;
            ctx.strokeRect(1, 1, TAMANO_IMAGEN - 2, TAMANO_IMAGEN - 2);
            
            resolve(canvas);
        });
    }

    function descargarURL(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    window.addEventListener('resize', function() {
        if (matriz.length > 0) {
            const currentAncho = anchoSolicitado;
            const currentAlto = altoSolicitado;
            
            anchoInput.value = currentAncho;
            altoInput.value = currentAlto;
            
            generarLaberinto();
        }
    });

    document.addEventListener('mouseup', manejarMouseUp);

    generarLaberinto();
});