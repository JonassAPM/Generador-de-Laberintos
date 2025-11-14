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
    const togglePantallaBtn = document.getElementById('togglePantallaBtn');
    const salirPantallaCompletaBtn = document.getElementById('salirPantallaCompletaBtn');
    const zoomSlider = document.getElementById('zoomSlider');
    const zoomValor = document.getElementById('zoomValor');
    const cronometro = document.getElementById('cronometro');
    const cronometroNormal = document.getElementById('cronometroNormal');

    // Elementos del modal
    const modalOverlay = document.getElementById('modalOverlay');
    const modalIcon = document.getElementById('modalIcon');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const modalAcceptBtn = document.getElementById('modalAcceptBtn');

    let ultimoAncho = anchoInput.value;
    let ultimoAlto = altoInput.value;
    let laberintoMaximizado = false;
    let tiempoInicio = null;
    let intervalo = null;
    let zoomActual = 100;
    let laberintoActual = null;
    let cronometroActivo = false;

    let matriz = [];
    let pila = [];
    let anchoSolicitado, altoSolicitado;
    let anchoTotal, altoTotal;
    let resolviendo = false;
    let dibujando = false;
    let celdasVisitadas = new Set();
    let mapaDependencias = new Map();
    
    let animacionActiva = false;
    let caminoAnimacion = [];
    let indiceAnimacion = 0;
    let timeoutAnimacion = null;

    let juegoGanado = false;
    let interaccionDeshabilitada = false;

    // Función para mostrar el modal
    function mostrarModal(titulo, mensaje, tipo = 'success') {
        // Configurar el modal según el tipo
        modalTitle.textContent = titulo;
        modalContent.textContent = mensaje;
        
        // Limpiar clases anteriores
        modalIcon.className = 'modal-icon';
        
        // Añadir clase según el tipo
        switch(tipo) {
            case 'success':
                modalIcon.classList.add('success');
                modalIcon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>';
                break;
            case 'info':
                modalIcon.classList.add('info');
                modalIcon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
                break;
            case 'warning':
                modalIcon.classList.add('warning');
                modalIcon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
                break;
            case 'error':
                modalIcon.classList.add('error');
                modalIcon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
                break;
        }
        
        // Mostrar el modal
        modalOverlay.classList.add('active');
        
        // Enfocar el botón de aceptar para mejor accesibilidad
        modalAcceptBtn.focus();
    }

    // Función para ocultar el modal
    function ocultarModal() {
        modalOverlay.classList.remove('active');
    }

    // Configurar evento para el botón de aceptar
    modalAcceptBtn.addEventListener('click', ocultarModal);
    
    // Cerrar modal al hacer clic fuera de él
    modalOverlay.addEventListener('click', function(event) {
        if (event.target === modalOverlay) {
            ocultarModal();
        }
    });
    
    // Cerrar modal con tecla Escape
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && modalOverlay.classList.contains('active')) {
            ocultarModal();
        }
    });

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

    function togglePantallaLaberinto() {
        if (resolviendo) return;
        
        if (laberintoMaximizado) {
            salirModoPantallaCompleta();
        } else {
            entrarModoPantallaCompleta();
        }
    }

    function entrarModoPantallaCompleta() {
        guardarEstadoLaberinto();
        
        container.classList.add('laberinto-maximizado');
        document.body.classList.add('laberinto-maximizado-active');
        laberintoMaximizado = true;
        
        setTimeout(() => {
            regenerarLaberintoDesdeDatos(true);
        }, 100);
    }

    function salirModoPantallaCompleta() {
        guardarEstadoLaberinto();
        
        container.classList.remove('laberinto-maximizado');
        container.classList.remove('laberinto-con-scroll');
        document.body.classList.remove('laberinto-maximizado-active');
        laberintoMaximizado = false;
        
        setTimeout(() => {
            regenerarLaberintoDesdeDatos(false);
        }, 100);
    }

    function guardarEstadoLaberinto() {
        if (!matriz.length) return;
        
        const estadoCeldas = [];
        for (let i = 0; i < altoTotal; i++) {
            const fila = [];
            for (let j = 0; j < anchoTotal; j++) {
                const celda = matriz[i][j];
                fila.push({
                    tipo: celda.tipo,
                    usuarioVisitado: celda.usuarioVisitado,
                    clases: Array.from(celda.domElement.classList),
                    visitado: celda.visitado
                });
            }
            estadoCeldas.push(fila);
        }
        
        laberintoActual = {
            estadoCeldas,
            anchoSolicitado,
            altoSolicitado,
            anchoTotal,
            altoTotal,
            celdasVisitadas: Array.from(celdasVisitadas),
            mapaDependencias: Array.from(mapaDependencias.entries()),
            tiempoInicio: tiempoInicio,
            cronometroActivo: cronometroActivo,
            tiempoTranscurrido: cronometroActivo ? Date.now() - tiempoInicio : 0,
            resolviendo: resolviendo,
            animacionActiva: animacionActiva,
            caminoAnimacion: animacionActiva ? caminoAnimacion : [],
            indiceAnimacion: animacionActiva ? indiceAnimacion : 0
        };
    }

    function regenerarLaberintoDesdeDatos(modoMaximizado) {
        if (!laberintoActual) return;
        
        container.innerHTML = '';
        
        matriz = [];
        anchoSolicitado = laberintoActual.anchoSolicitado;
        altoSolicitado = laberintoActual.altoSolicitado;
        anchoTotal = laberintoActual.anchoTotal;
        altoTotal = laberintoActual.altoTotal;
        celdasVisitadas = new Set(laberintoActual.celdasVisitadas);
        mapaDependencias = new Map(laberintoActual.mapaDependencias);
        
        resolviendo = laberintoActual.resolviendo || false;
        animacionActiva = laberintoActual.animacionActiva || false;
        caminoAnimacion = laberintoActual.caminoAnimacion || [];
        indiceAnimacion = laberintoActual.indiceAnimacion || 0;
        
        if (laberintoActual.cronometroActivo) {
            tiempoInicio = Date.now() - laberintoActual.tiempoTranscurrido;
            cronometroActivo = true;
            iniciarCronometro();
        } else {
            const tiempoTranscurrido = laberintoActual.tiempoTranscurrido || 0;
            const minutos = Math.floor(tiempoTranscurrido / 60000);
            const segundos = Math.floor((tiempoTranscurrido % 60000) / 1000);
            const tiempoTexto = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
            cronometro.textContent = tiempoTexto;
            cronometroNormal.textContent = tiempoTexto;
        }
        
        let tamanoCelda;
        
        if (modoMaximizado) {
            const anchoDisponible = window.innerWidth;
            const altoDisponible = window.innerHeight - 60;
            const tamanoCeldaHorizontal = anchoDisponible / anchoTotal;
            const tamanoCeldaVertical = altoDisponible / altoTotal;
            tamanoCelda = Math.min(tamanoCeldaHorizontal, tamanoCeldaVertical);
            tamanoCelda = Math.max(2, tamanoCelda);
        } else {
            const porcentajeAncho = 0.9;
            const porcentajeAlto = 0.80;
            const anchoDisponible = window.innerWidth * porcentajeAncho;
            const altoDisponible = (window.innerHeight - 200) * porcentajeAlto;
            const tamanoCeldaHorizontal = anchoDisponible / anchoTotal;
            const tamanoCeldaVertical = altoDisponible / altoTotal;
            tamanoCelda = Math.min(tamanoCeldaHorizontal, tamanoCeldaVertical);
            tamanoCelda = Math.max(2, tamanoCelda);
        }

        container.style.gridTemplateColumns = `repeat(${anchoTotal}, ${tamanoCelda}px)`;
        container.style.gridAutoRows = `${tamanoCelda}px`;
        container.style.width = `${anchoTotal * tamanoCelda}px`;
        container.style.height = `${altoTotal * tamanoCelda}px`;
        container.style.overflow = modoMaximizado ? 'hidden' : 'hidden';

        for (let i = 0; i < altoTotal; i++) {
            const fila = [];
            for (let j = 0; j < anchoTotal; j++) {
                const celdaData = laberintoActual.estadoCeldas[i][j];
                const celdaDOM = document.createElement('div');
                celdaDOM.classList.add('celda');

                celdaData.clases.forEach(clase => {
                    if (clase !== 'celda') {
                        celdaDOM.classList.add(clase);
                    }
                });
                
                if (celdaData.tipo === 1 && !celdaDOM.classList.contains('muro')) {
                    celdaDOM.classList.add('muro');
                } else if (celdaData.tipo === 0 && celdaDOM.classList.contains('muro')) {
                    celdaDOM.classList.remove('muro');
                }
                
                celdaDOM.addEventListener('mousedown', manejarMouseDown);
                celdaDOM.addEventListener('mouseenter', manejarMouseEnter);
                celdaDOM.addEventListener('mouseup', manejarMouseUp);
                
                container.appendChild(celdaDOM);
                
                fila.push({
                    fila: i,
                    col: j,
                    tipo: celdaData.tipo,
                    visitado: celdaData.visitado,
                    domElement: celdaDOM,
                    usuarioVisitado: celdaData.usuarioVisitado
                });
            }
            matriz.push(fila);
        }
        
        actualizarEstadoBotones();
        
        if (animacionActiva && caminoAnimacion.length > 0 && indiceAnimacion < caminoAnimacion.length) {
            setTimeout(() => {
                reanudarAnimacionCamino();
            }, 100);
        }
    }

    function actualizarEstadoBotones() {
        resolverBtn.disabled = resolviendo;
        generarBtn.disabled = resolviendo;
        togglePantallaBtn.disabled = resolviendo;
        
        if (resolviendo) {
            togglePantallaBtn.classList.add('btn-disabled');
        } else {
            togglePantallaBtn.classList.remove('btn-disabled');
        }
    }

    function reanudarAnimacionCamino() {
        if (!animacionActiva || !caminoAnimacion.length) return;

        function siguientePaso() {
            if (indiceAnimacion >= caminoAnimacion.length || !animacionActiva) {
                animacionActiva = false;
                resolviendo = false;
                actualizarEstadoBotones();
                detenerCronometro();
                if (indiceAnimacion >= caminoAnimacion.length) {
                    mostrarModal('¡Solucionado!', 'El laberinto ha sido resuelto automáticamente.', 'success');
                }
                return;
            }

            const celda = caminoAnimacion[indiceAnimacion];
            if (!celda.domElement.classList.contains('inicio') &&
                !celda.domElement.classList.contains('fin')) {
                celda.domElement.classList.add('camino');
            }
            
            indiceAnimacion++;

            const area = anchoSolicitado * altoSolicitado;
            const factorVelocidad = Math.max(0.1, Math.min(1, 1000 / area));
            const velocidadUsuario = parseInt(velocidadSlider.value);
            const delay = Math.max(1, Math.floor(velocidadUsuario * factorVelocidad));

            timeoutAnimacion = setTimeout(siguientePaso, delay);
        }

        siguientePaso();
    }

    function detenerAnimacion() {
        animacionActiva = false;
        if (timeoutAnimacion) {
            clearTimeout(timeoutAnimacion);
            timeoutAnimacion = null;
        }
    }

    function ajustarLaberintoMaximizado() {
        if (!laberintoMaximizado) return;
        
        const anchoDisponible = window.innerWidth;
        const altoDisponible = window.innerHeight - 60;
        
        const tamanoCeldaHorizontal = anchoDisponible / anchoTotal;
        const tamanoCeldaVertical = altoDisponible / altoTotal;
        
        let tamanoCelda = Math.min(tamanoCeldaHorizontal, tamanoCeldaVertical);
        tamanoCelda = Math.max(2, tamanoCelda);
        
        container.style.gridTemplateColumns = `repeat(${anchoTotal}, ${tamanoCelda}px)`;
        container.style.gridAutoRows = `${tamanoCelda}px`;
        container.style.width = `${anchoTotal * tamanoCelda}px`;
        container.style.height = `${altoTotal * tamanoCelda}px`;
    }

    function iniciarCronometro() {
        if (cronometroActivo) return;
        
        tiempoInicio = Date.now();
        cronometroActivo = true;
        detenerCronometro();
        
        intervalo = setInterval(() => {
            const tiempoTranscurrido = Date.now() - tiempoInicio;
            const minutos = Math.floor(tiempoTranscurrido / 60000);
            const segundos = Math.floor((tiempoTranscurrido % 60000) / 1000);
            const tiempoTexto = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
            
            cronometro.textContent = tiempoTexto;
            cronometroNormal.textContent = tiempoTexto;
        }, 1000);
    }

    function detenerCronometro() {
        if (intervalo) {
            clearInterval(intervalo);
            intervalo = null;
        }
    }

    function aplicarZoom() {
        const factorZoom = zoomActual / 100;
        
        if (zoomActual > 100) {
            container.classList.add('laberinto-con-scroll');
            const tamanoCeldaBase = calcularTamanoCeldaBase();
            const nuevoTamano = Math.max(2, tamanoCeldaBase * factorZoom);
            
            container.style.gridTemplateColumns = `repeat(${anchoTotal}, ${nuevoTamano}px)`;
            container.style.gridAutoRows = `${nuevoTamano}px`;
            container.style.width = `${anchoTotal * nuevoTamano}px`;
            container.style.height = `${altoTotal * nuevoTamano}px`;
        } else {
            container.classList.remove('laberinto-con-scroll');
            if (laberintoMaximizado) {
                ajustarLaberintoMaximizado();
            } else {
                const tamanoCeldaBase = calcularTamanoCeldaBase();
                container.style.gridTemplateColumns = `repeat(${anchoTotal}, ${tamanoCeldaBase}px)`;
                container.style.gridAutoRows = `${tamanoCeldaBase}px`;
                container.style.width = `${anchoTotal * tamanoCeldaBase}px`;
                container.style.height = `${altoTotal * tamanoCeldaBase}px`;
            }
        }
    }

    function calcularTamanoCeldaBase() {
        if (laberintoMaximizado) {
            const anchoDisponible = window.innerWidth;
            const altoDisponible = window.innerHeight - 60;
            const tamanoCeldaHorizontal = anchoDisponible / anchoTotal;
            const tamanoCeldaVertical = altoDisponible / altoTotal;
            return Math.min(tamanoCeldaHorizontal, tamanoCeldaVertical);
        } else {
            const porcentajeAncho = 0.9;
            const porcentajeAlto = 0.75;
            const anchoDisponible = window.innerWidth * porcentajeAncho;
            const altoDisponible = (window.innerHeight - 200) * porcentajeAlto;
            const tamanoCeldaHorizontal = anchoDisponible / anchoTotal;
            const tamanoCeldaVertical = altoDisponible / altoTotal;
            return Math.min(tamanoCeldaHorizontal, tamanoCeldaVertical);
        }
    }

    function manejarInputZoom() {
        const nuevoZoom = parseInt(zoomSlider.value);
        
        if (nuevoZoom < 100) {
            zoomSlider.value = 100;
            zoomActual = 100;
        } else if (nuevoZoom > 500) {
            zoomSlider.value = 500;
            zoomActual = 500;
        } else {
            zoomActual = nuevoZoom;
        }
        
        zoomValor.textContent = `${zoomActual}%`;
        aplicarZoom();
        
        if (!cronometroActivo && (celdasVisitadas.size > 1 || dibujando)) {
            iniciarCronometro();
        }
    }

    function manejarInputZoomDirecto(event) {
        if (event.key === 'Enter') {
            const input = event.target;
            let valor = parseInt(input.value);
            
            if (isNaN(valor) || valor < 100) {
                valor = 100;
            } else if (valor > 500) {
                valor = 500;
            }
            
            input.value = valor;
            zoomSlider.value = valor;
            zoomActual = valor;
            zoomValor.textContent = `${valor}%`;
            aplicarZoom();
            input.blur();
        }
    }

    zoomSlider.value = 100;
    zoomActual = 100;
    zoomValor.textContent = '100%';

    cronometro.textContent = '00:00';
    cronometroNormal.textContent = '00:00';

    togglePantallaBtn.addEventListener('click', togglePantallaLaberinto);
    salirPantallaCompletaBtn.addEventListener('click', salirModoPantallaCompleta);

    zoomSlider.addEventListener('input', manejarInputZoom);
    
    zoomValor.addEventListener('click', function() {
        const input = document.createElement('input');
        input.type = 'number';
        input.value = zoomActual;
        input.min = 100;
        input.max = 500;
        input.style.width = '50px';
        input.style.border = 'none';
        input.style.background = 'transparent';
        input.style.color = 'white';
        input.style.textAlign = 'center';
        input.style.fontFamily = 'Courier New, monospace';
        input.style.fontWeight = '700';
        
        this.replaceWith(input);
        input.focus();
        input.select();
        
        input.addEventListener('keydown', manejarInputZoomDirecto);
        input.addEventListener('blur', function() {
            zoomValor.textContent = `${zoomActual}%`;
            input.replaceWith(zoomValor);
        });
    });

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && laberintoMaximizado) {
            salirModoPantallaCompleta();
        }
    });

    window.addEventListener('resize', function() {
        if (laberintoMaximizado) {
            ajustarLaberintoMaximizado();
        } else {
            aplicarZoom();
        }
    });

    anchoInput.addEventListener('input', sincronizarDesdeAncho);
    altoInput.addEventListener('input', sincronizarDesdeAlto);
    
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

    function generarLaberinto() {
        juegoGanado = false;
        interaccionDeshabilitada = false;
        
        detenerAnimacion();
        
        resolviendo = false;
        dibujando = false;
        animacionActiva = false;
        actualizarEstadoBotones();
        celdasVisitadas.clear();
        mapaDependencias.clear();
        detenerCronometro();
        cronometroActivo = false;
        
        cronometro.textContent = '00:00';
        cronometroNormal.textContent = '00:00';
        
        zoomActual = 100;
        zoomSlider.value = 100;
        zoomValor.textContent = '100%';
        
        const celdasCamino = document.querySelectorAll('.celda.camino, .celda.usuario');
        celdasCamino.forEach(c => {
            c.classList.remove('camino');
            c.classList.remove('usuario');
        });

        const MIN_DIM = 5;
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
        caminoAnimacion = [];
        indiceAnimacion = 0;

        const porcentajeAncho = 0.9;
        const porcentajeAlto = 0.75;
        
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
                
                // Eventos para mouse
                celdaDOM.addEventListener('mousedown', manejarMouseDown);
                celdaDOM.addEventListener('mouseenter', manejarMouseEnter);
                celdaDOM.addEventListener('mouseup', manejarMouseUp);
                
                // Eventos para touch (móvil)
                celdaDOM.addEventListener('touchstart', manejarTouchStart, { passive: false });
                celdaDOM.addEventListener('touchmove', manejarTouchMove, { passive: false });
                celdaDOM.addEventListener('touchend', manejarTouchEnd);
                
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
        container.classList.remove('laberinto-deshabilitado');
    }

    function manejarTouchStart(event) {
        if (interaccionDeshabilitada || resolviendo) return;
        
        event.preventDefault();
        
        if (!cronometroActivo) {
            iniciarCronometro();
        }
        
        const touch = event.touches[0];
        const celda = encontrarCeldaDesdeCoordenadas(touch.clientX, touch.clientY);
        
        if (celda && celda.tipo === 0 && !celda.domElement.classList.contains('muro')) {
            dibujando = true;
            
            if (celda.domElement.classList.contains('inicio')) {
                return;
            }
            
            if (celda.domElement.classList.contains('usuario')) {
                deseleccionarCeldaYHijos(celda);
            } else {
                if (esCeldaValidaParaUsuario(celda)) {
                    seleccionarCelda(celda);
                }
            }
        }
    }

    function manejarTouchMove(event) {
        if (!dibujando || interaccionDeshabilitada || resolviendo) return;
        
        event.preventDefault();
        
        const touch = event.touches[0];
        const celda = encontrarCeldaDesdeCoordenadas(touch.clientX, touch.clientY);
        
        if (celda && celda.tipo === 0 && !celda.domElement.classList.contains('muro')) {
            if (celda.domElement.classList.contains('inicio')) {
                return;
            }
            
            if (celda.domElement.classList.contains('usuario')) {
                deseleccionarCeldaYHijos(celda);
            } else {
                if (!celda.domElement.classList.contains('usuario') && esCeldaValidaParaUsuario(celda)) {
                    seleccionarCelda(celda);
                }
            }
        }
    }

    function manejarTouchEnd() {
        if (interaccionDeshabilitada) return;
        
        dibujando = false;
        if (!juegoGanado) {
            verificarVictoria();
        }
    }

    function encontrarCeldaDesdeCoordenadas(x, y) {
        const rect = container.getBoundingClientRect();

        const relativeX = x - rect.left;
        const relativeY = y - rect.top;

        const col = Math.floor(relativeX / (rect.width / anchoTotal));
        const fila = Math.floor(relativeY / (rect.height / altoTotal));

        if (fila >= 0 && fila < altoTotal && col >= 0 && col < anchoTotal) {
            return matriz[fila][col];
        }
        
        return null;
    }

    function manejarMouseDown(event) {
        if (interaccionDeshabilitada || resolviendo) return;
        
        if (!cronometroActivo) {
            iniciarCronometro();
        }
        
        const celda = encontrarCeldaDesdeElemento(event.target);
        if (celda && celda.tipo === 0 && !celda.domElement.classList.contains('muro')) {
            dibujando = true;
            
            if (celda.domElement.classList.contains('inicio')) {
                return;
            }
            
            if (celda.domElement.classList.contains('usuario')) {
                deseleccionarCeldaYHijos(celda);
            } else {
                if (esCeldaValidaParaUsuario(celda)) {
                    seleccionarCelda(celda);
                }
            }
        }
    }

    function manejarMouseEnter(event) {
        if (interaccionDeshabilitada || !dibujando || resolviendo) return;
        
        const celda = encontrarCeldaDesdeElemento(event.target);
        if (celda && celda.tipo === 0 && !celda.domElement.classList.contains('muro')) {
            if (celda.domElement.classList.contains('inicio')) {
                return;
            }
            
            if (celda.domElement.classList.contains('usuario')) {
                deseleccionarCeldaYHijos(celda);
            } else {
                if (!celda.domElement.classList.contains('usuario') && esCeldaValidaParaUsuario(celda)) {
                    seleccionarCelda(celda);
                }
            }
        }
    }

    function manejarMouseUp() {
        if (interaccionDeshabilitada) return;
        
        dibujando = false;
        if (!juegoGanado) {
            verificarVictoria();
        }
    }

    function encontrarCeldaDesdeElemento(elemento) {
        if (elemento.classList.contains('celda')) {
            for (let i = 0; i < altoTotal; i++) {
                for (let j = 0; j < anchoTotal; j++) {
                    if (matriz[i][j].domElement === elemento) {
                        return matriz[i][j];
                    }
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
        if (celda.domElement.classList.contains('inicio')) return false;
        
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
        if (juegoGanado || interaccionDeshabilitada) return;
        
        const fin = matriz[altoTotal - 2][anchoTotal - 2];
        if (fin.usuarioVisitado) {
            juegoGanado = true;
            interaccionDeshabilitada = true;
            detenerCronometro();
            
            setTimeout(() => {
                mostrarModal('¡Felicidades!', 'Has resuelto el laberinto correctamente.', 'success');
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
        if (resolviendo || interaccionDeshabilitada) return;
        resolviendo = true;
        dibujando = false;
        animacionActiva = true;
        actualizarEstadoBotones();

        if (!cronometroActivo) {
            iniciarCronometro();
        }

        const celdasUsuario = document.querySelectorAll('.celda.usuario');
        celdasUsuario.forEach(c => c.classList.remove('usuario'));
        celdasVisitadas.clear();
        mapaDependencias.clear();

        const camino = encontrarCaminoBFS();

        if (camino.length > 0) {
            caminoAnimacion = camino;
            indiceAnimacion = 0;
            animarCamino();
        } else {
            mostrarModal("Sin solución", "No se encontró una solución para este laberinto.", "warning");
            resolviendo = false;
            animacionActiva = false;
            actualizarEstadoBotones();
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

    function animarCamino() {
        if (!animacionActiva) return;
        
        function siguientePaso() {
            if (indiceAnimacion >= caminoAnimacion.length || !animacionActiva) {
                animacionActiva = false;
                resolviendo = false;
                actualizarEstadoBotones();
                detenerCronometro();
                if (indiceAnimacion >= caminoAnimacion.length) {
                    juegoGanado = true;
                    interaccionDeshabilitada = true; // Deshabilitar interacción
                    mostrarModal('¡Solucionado!', 'El laberinto ha sido resuelto automáticamente.', 'success');
                }
                return;
            }

            const celda = caminoAnimacion[indiceAnimacion];
            if (!celda.domElement.classList.contains('inicio') &&
                !celda.domElement.classList.contains('fin')) {
                celda.domElement.classList.add('camino');
            }
            
            indiceAnimacion++;

            const area = anchoSolicitado * altoSolicitado;
            const factorVelocidad = Math.max(0.1, Math.min(1, 1000 / area));
            const velocidadUsuario = parseInt(velocidadSlider.value);
            const delay = Math.max(1, Math.floor(velocidadUsuario * factorVelocidad));

            timeoutAnimacion = setTimeout(siguientePaso, delay);
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
            
            mostrarModal('Descarga completada', 'La imagen del laberinto se ha descargado correctamente.', 'info');
            
        } catch (error) {
            console.error('Error al generar imagen:', error);
            mostrarModal('Error', 'Ha ocurrido un error al generar la imagen.', 'error');
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

    document.addEventListener('mouseup', manejarMouseUp);

    document.addEventListener('touchcancel', function() {
        dibujando = false;
    });

    document.addEventListener('mouseleave', function() {
        dibujando = false;
    });
    generarLaberinto();
});