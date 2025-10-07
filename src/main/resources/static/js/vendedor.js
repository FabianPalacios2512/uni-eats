/**
 * @file Script principal para el Dashboard de Vendedores de Uni-Eats.
 * @description Gestiona la renderización, lógica y comunicación con el API para el panel de control del vendedor.
 * @version 9.0 (Optimizado para PWA - Sistema modular)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Start immediately without waiting - no more infinite loops!
    console.log('🚀 Starting Vendor Dashboard immediately');
    startVendorApp();
});

function startVendorApp() {
    // Simple fallback utilities - no complex dependencies
    window.Logger = window.Logger || {
        info: (component, message) => console.log(`ℹ️ ${component}: ${message}`),
        warn: (component, message) => console.warn(`⚠️ ${component}: ${message}`),
        error: (component, message) => console.error(`❌ ${component}: ${message}`),
        debug: (component, message) => console.log(`🐛 ${component}: ${message}`)
    };
    
    window.Icons = window.Icons || {
        getClass: (key) => {
            const fallbacks = {
                'status.success': 'fas fa-check-circle',
                'status.error': 'fas fa-times-circle',
                'status.warning': 'fas fa-exclamation-triangle',
                'status.info': 'fas fa-info-circle',
                'status.loading': 'fas fa-spinner fa-spin'
            };
            return fallbacks[key] || 'fas fa-question';
        },
        html: (key, classes = '') => `<i class="${window.Icons.getClass(key)} ${classes}"></i>`
    };

    // Make App globally accessible to fix onclick handlers
    window.App = {
        config: {
            container: document.getElementById('vendor-dashboard-container'),
            csrfToken: document.querySelector("meta[name='_csrf']")?.getAttribute("content"),
            csrfHeader: document.querySelector("meta[name='_csrf_header']")?.getAttribute("content"),
            apiEndpoints: {
                getDashboard: '/api/vendedor/dashboard', 
                getPedidos: '/api/vendedor/pedidos', // Endpoint para obtener pedidos
                aceptarPedido: '/api/vendedor/pedidos/{id}/aceptar',
                listoPedido: '/api/vendedor/pedidos/{id}/listo',
                entregadoPedido: '/api/vendedor/pedidos/{id}/entregado',
                cancelarPedido: '/api/vendedor/pedidos/{id}/cancelar',
                getCategorias: '/api/vendedor/opciones/categorias',
                crearCategoria: '/api/vendedor/opciones/categorias/crear',
                asignarCategoria: '/api/vendedor/productos/',
                createStore: '/api/vendedor/tienda/crear',
                updateStore: '/api/vendedor/tienda/actualizar',
                createProduct: '/api/vendedor/productos/crear',
                updateSchedules: '/api/vendedor/horarios/actualizar',
                // Endpoints para productos potenciados
                potenciarProductos: '/api/productos-potenciados/potenciar',
                getPromocionesActivas: '/api/productos-potenciados/activos',
                getMisPromociones: '/api/productos-potenciados/tienda/mis-promociones',
                cancelarPotenciacion: '/api/productos-potenciados/cancelar'
            }
        },

        state: {
            tienda: null,
            productos: [],
            horarios: [],
            categorias: [],
            fabButton: null,
            currentView: 'pedidos', // Track current view
            productViewMode: 'compact', // 'compact' or 'cards'
            pedidosPolling: null, // Polling interval for pedidos
            estadisticasPolling: null, // Polling interval for estadisticas
            lastPedidosCount: 0, // Track number of pedidos for notifications
            isPollingActive: false, // Track polling state
            lastPedidosHash: null, // Hash of last pedidos data to detect real changes
            currentPedidos: [], // Store current pedidos for comparison
            pollingInterval: 5000, // Start with 5 seconds (fast for new orders)
            maxPollingInterval: 30000, // Max 30 seconds (when inactive)
            minPollingInterval: 3000, // Min 3 seconds (ultra fast for active periods)
            consecutiveNoChanges: 0, // Counter for no changes
            lastActivityTime: Date.now(), // Track last activity
            isUserActive: true, // Track if user is actively using the app
            lastUserInteraction: Date.now() // Track last user interaction
        },

        api: {
            async request(endpoint, options = {}, submitButton = null) {
                const originalButtonContent = submitButton ? submitButton.innerHTML : '';
                if (submitButton) {
                    submitButton.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>Guardando...`;
                    submitButton.disabled = true;
                }
                try {
                    const headers = { [App.config.csrfHeader]: App.config.csrfToken, ...options.headers };
                    if (options.body instanceof FormData) {
                        delete headers['Content-Type'];
                    } else if (options.body) {
                        headers['Content-Type'] = 'application/json';
                    }
                    
                    // Add timeout to prevent hanging requests
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
                    
                    const response = await fetch(endpoint, { 
                        ...options, 
                        headers,
                        signal: controller.signal 
                    });
                    
                    clearTimeout(timeoutId);
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(errorText || `Error del servidor: ${response.status}`);
                    }
                    return response;
                } catch (error) {
                    if (error.name === 'AbortError') {
                        Logger.warn('API', `Request timeout to ${endpoint}`);
                        App.ui.showToast('La solicitud tardó demasiado tiempo', 'error');
                        throw new Error('Tiempo de espera agotado');
                    }
                    Logger.error('API', `Request failed to ${endpoint}`, error);
                    App.ui.showToast(`Error: ${error.message}`, 'error');
                    throw error;
                } finally {
                    if (submitButton) {
                        submitButton.innerHTML = originalButtonContent;
                        submitButton.disabled = false;
                    }
                }
            }
        },

        ui: {
            render(html) { App.config.container.innerHTML = html; },

            showToast(message, type = 'success') {
                const toast = document.createElement('div');
                const iconClass = Icons.getClass(`status.${type}`);
                const colors = { 
                    success: 'bg-green-500', 
                    error: 'bg-red-500', 
                    info: 'bg-blue-500', 
                    warning: 'bg-amber-500' 
                };
                
                toast.className = `fixed bottom-24 right-5 ${colors[type]} text-white py-3 px-5 rounded-lg shadow-xl flex items-center gap-3 animate-fadeIn z-50`;
                toast.innerHTML = `<i class="${iconClass}"></i><p>${message}</p>`;
                
                document.body.appendChild(toast);
                setTimeout(() => {
                    toast.classList.add('animate-fadeOut');
                    toast.addEventListener('animationend', () => toast.remove());
                }, 1000);
            },

            showNewOrderNotification(pedidosCount) {
                // Only show notification if there are actually new orders
                if (pedidosCount > App.state.lastPedidosCount && App.state.lastPedidosCount > 0) {
                    const newOrdersCount = pedidosCount - App.state.lastPedidosCount;
                    this.showToast(`🆕 ${newOrdersCount} nuevo${newOrdersCount > 1 ? 's' : ''} pedido${newOrdersCount > 1 ? 's' : ''}`, 'info');
                    
                    // Add visual indicator to Pedidos tab if not currently viewing it
                    if (App.state.currentView !== 'pedidos') {
                        const pedidosTab = document.querySelector('.nav-link[data-target="pedidos"]');
                        if (pedidosTab && !pedidosTab.querySelector('.notification-dot')) {
                            const dot = document.createElement('div');
                            dot.className = 'notification-dot absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-bounce';
                            pedidosTab.style.position = 'relative';
                            pedidosTab.appendChild(dot);
                        }
                    }
                }
                App.state.lastPedidosCount = pedidosCount;
            },

            // Generate a simple hash from pedidos data to detect real changes
            generatePedidosHash(pedidos) {
                if (!pedidos || pedidos.length === 0) return 'empty';
                
                // Create a hash based on: ID + Estado + Total of each pedido
                const hashString = pedidos.map(p => `${p.id}-${p.estado}-${p.total}`).join('|');
                
                // Simple hash function
                let hash = 0;
                for (let i = 0; i < hashString.length; i++) {
                    const char = hashString.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash; // Convert to 32-bit integer
                }
                return hash.toString();
            },

            checkForPedidosChanges(newPedidos) {
                const newHash = this.generatePedidosHash(newPedidos);
                const hasChanges = App.state.lastPedidosHash !== newHash;
                
                if (hasChanges) {
                    console.log('🔄 Cambios detectados en pedidos, actualizando UI...');
                    App.state.lastPedidosHash = newHash;
                    App.state.currentPedidos = newPedidos;
                    return true;
                } else {
                    console.log('✅ No hay cambios en pedidos, manteniendo UI actual');
                    return false;
                }
            },

            switchView(targetId) {
                // Agregar feedback visual inmediato
                const activeLink = document.querySelector(`.nav-link[data-target="${targetId}"]`);
                if (activeLink && targetId === 'pedidos') {
                    const originalHTML = activeLink.innerHTML;
                    activeLink.innerHTML = originalHTML.replace('Pedidos', '<i class="fas fa-spinner fa-spin mr-1"></i>Pedidos');
                    setTimeout(() => {
                        activeLink.innerHTML = originalHTML;
                    }, 1000);
                }
                
                // Ocultar todas las vistas (tanto main-view como view)
                document.querySelectorAll('.main-view, .view').forEach(view => { 
                    view.style.display = 'none'; 
                    view.classList.add('hidden');
                });
                document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
                
                // Buscar la vista activa por ambos formatos de ID
                let activeView = document.getElementById(`view-${targetId}`) || document.getElementById(`${targetId}-view`);
                
                if (activeView) {
                    activeView.style.display = 'block';
                    activeView.classList.remove('hidden');
                }
                if (activeLink) activeLink.classList.add('active');
                
                if (App.state.fabButton) {
                    App.state.fabButton.style.display = (targetId === 'productos') ? 'flex' : 'none';
                }
                
                // Save current view to localStorage
                App.state.currentView = targetId;
                localStorage.setItem('vendedor-current-view', targetId);

                // Manage real-time polling and data loading based on current view
                if (targetId === 'pedidos') {
                    // Recargar datos de pedidos al cambiar a esta vista
                    window.Logger.info('Navigation', 'Cambiando a vista de pedidos - recargando datos');
                    App.components.Pedidos.loadPedidos(true).then(() => {
                        App.components.Pedidos.startPolling();
                    }).catch(error => {
                        window.Logger.error('Navigation', 'Error recargando pedidos al cambiar vista', error);
                        // Intentar iniciar polling aunque falle la carga inicial
                        App.components.Pedidos.startPolling();
                    });
                } else {
                    App.components.Pedidos.stopPolling();
                }

                // Cargar datos específicos para promociones
                if (targetId === 'promociones') {
                    App.components.Promociones.cargarPromocionesActivas();
                }
            },
            
            initModal(modalId, onOpen = () => {}) {
                const modal = document.getElementById(modalId);
                if (!modal) return;
                const openTriggers = document.querySelectorAll(`[data-modal-open="${modalId}"]`);
                const closeModal = () => modal.classList.add('hidden');
                modal.querySelectorAll('[data-modal-close]').forEach(btn => btn.addEventListener('click', closeModal));
                const specificCloseBtn = document.getElementById(`${modalId}-close-btn`);
                const specificCancelBtn = document.getElementById(`${modalId}-cancel-btn`);
                const specificScrim = document.getElementById(`${modalId}-scrim`);
                if (specificCloseBtn) specificCloseBtn.addEventListener('click', closeModal);
                if (specificCancelBtn) specificCancelBtn.addEventListener('click', closeModal);
                if (specificScrim) specificScrim.addEventListener('click', closeModal);
                openTriggers.forEach(btn => btn.addEventListener('click', (e) => {
                    if (e) e.preventDefault();
                    onOpen();
                    modal.classList.remove('hidden');
                }));
            }
        },
        
        components: {
            Welcome: {
                render() {
                    return `
                        <div class="flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden">
                            <div id="welcome-step" class="w-full max-w-md text-center transition-opacity duration-500 animate-fadeIn">
                                <div class="w-24 h-24 mb-6 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-4xl shadow-lg animate-pulse-slow"><i class="fas fa-store text-4xl"></i></div>
                                <h1 class="text-3xl font-bold text-slate-800">¡Bienvenido a Uni-Eats!</h1>
                                <p class="text-slate-500 mt-4 max-w-sm mx-auto">Para empezar a vender, configura la información de tu tienda.</p>
                                <button id="continue-button" class="mt-8 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg transform hover:scale-105 transition-transform">Continuar <i class="fas fa-arrow-right ml-2"></i></button>
                            </div>
                            <div id="form-step" class="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl transition-opacity duration-500 opacity-0" style="display: none;">
                                <h1 class="text-2xl font-bold text-slate-800 text-center mb-6">Información de tu Tienda</h1>
                                <form id="crear-tienda-form" class="space-y-6">
                                    <div class="relative"><input type="text" name="nombre" class="input-field block w-full px-4 py-4 border-2 border-slate-300 rounded-lg" placeholder=" " required><label class="floating-label">Nombre de la Tienda</label></div>
                                    <div class="relative"><input type="text" name="nit" class="input-field block w-full px-4 py-4 border-2 border-slate-300 rounded-lg" placeholder=" " required><label class="floating-label">NIT o Documento</label></div>
                                    <div class="relative"><textarea name="descripcion" rows="3" class="textarea-field block w-full px-4 py-4 border-2 border-slate-300 rounded-lg" placeholder=" " required></textarea><label class="floating-label">Descripción Corta</label></div>
                                    <div><label class="block text-sm font-medium text-slate-700 mb-2">Logo de la Tienda</label><input type="file" name="logo" class="w-full" accept="image/png, image/jpeg" required></div>
                                    <button type="submit" class="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg">Enviar para Aprobación</button>
                                </form>
                            </div>
                        </div>`;
                },
                init() {
                    const continueButton = document.getElementById('continue-button');
                    const welcomeStep = document.getElementById('welcome-step');
                    const formStep = document.getElementById('form-step');
                    const form = document.getElementById('crear-tienda-form');
                    if (continueButton) {
                        continueButton.addEventListener('click', () => {
                            welcomeStep.classList.add('animate-fadeOut');
                            welcomeStep.addEventListener('animationend', () => {
                                welcomeStep.style.display = 'none';
                                formStep.style.display = 'block';
                                formStep.classList.add('animate-fadeIn');
                            }, { once: true });
                        });
                    }
                    if (form) {
                        form.addEventListener('submit', async (e) => {
                            e.preventDefault();
                            const formData = new FormData(form);
                            const submitButton = form.querySelector('button[type="submit"]');
                            try {
                                await App.api.request(App.config.apiEndpoints.createStore, { method: 'POST', body: formData }, submitButton);
                                App.ui.showToast('¡Tienda enviada para aprobación!');
                                setTimeout(() => window.location.reload(), 1500);
                            } catch (error) { /* Error manejado en App.api */ }
                        });
                    }
                }
            },
            
            Dashboard: {
                render(tienda) {
                    return `
                        <div class="w-full max-w-lg mx-auto pb-24 bg-slate-50 min-h-screen">
                            <main id="main-content"></main>
                            <nav class="fixed bottom-0 left-0 right-0 w-full max-w-lg mx-auto bg-white/90 backdrop-blur-md border-t-2 border-slate-200 flex justify-around z-40 shadow-t-lg">
                                <a href="#" class="nav-link" data-target="pedidos"><div class="flex flex-col items-center justify-center w-full pt-2 pb-1"><i class="fas fa-receipt nav-icon text-xl"></i><span class="text-xs mt-1 font-medium">Pedidos</span><span class="nav-indicator"></span></div></a>
                                <a href="#" class="nav-link" data-target="productos"><div class="flex flex-col items-center justify-center w-full pt-2 pb-1"><i class="fas fa-hamburger nav-icon text-xl"></i><span class="text-xs mt-1 font-medium">Productos</span><span class="nav-indicator"></span></div></a>
                                <a href="#" class="nav-link" data-target="promociones"><div class="flex flex-col items-center justify-center w-full pt-2 pb-1"><i class="fas fa-fire nav-icon text-xl"></i><span class="text-xs mt-1 font-medium">Promociones</span><span class="nav-indicator"></span></div></a>
                                <a href="#" class="nav-link" data-target="perfil"><div class="flex flex-col items-center justify-center w-full pt-2 pb-1"><i class="fas fa-store nav-icon text-xl"></i><span class="text-xs mt-1 font-medium">Mi Tienda</span><span class="nav-indicator"></span></div></a>
                            </nav>
                            <button data-modal-open="product-modal" class="fixed bottom-24 right-5 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center z-30 transform hover:scale-110 active:scale-100 transition-transform duration-200">
                                <i class="fas fa-plus text-xl"></i>
                            </button>
                        </div>`;
                },
                init(data) {
                    const mainContent = document.getElementById('main-content');
                    if (!mainContent) return;
                    App.state.fabButton = document.querySelector('[data-modal-open="product-modal"]');
                    
                    // Render all components immediately - no async blocking
                    mainContent.innerHTML = `
                        ${App.components.Pedidos.render(data)}
                        ${App.components.Productos.render(data)}
                        ${App.components.Promociones.render(data)}
                        ${App.components.Perfil.render(data)}
                    `;
                    
                    // Initialize components immediately - make them non-blocking
                    App.components.Pedidos.initNonBlocking(data);
                    App.components.Productos.init(data);
                    App.components.Promociones.init(data);
                    App.components.Perfil.init(data);
                    
                    document.querySelectorAll('.nav-link').forEach(link => {
                        link.addEventListener('click', (e) => { e.preventDefault(); App.ui.switchView(link.dataset.target); });
                    });
                    
                    // Lógica inteligente de navegación
                    const savedView = localStorage.getItem('vendedor-current-view');
                    const sessionActive = sessionStorage.getItem('vendedor-session-active');
                    
                    let targetView = 'pedidos'; // Por defecto siempre pedidos
                    
                    // Solo mantener la vista guardada si es un refresh en la misma sesión
                    if (sessionActive && savedView) {
                        targetView = savedView;
                        window.Logger.info('Navigation', `Manteniendo vista: ${savedView} (refresh en sesión activa)`);
                    } else {
                        window.Logger.info('Navigation', 'Nueva sesión - iniciando en Pedidos');
                        // Marcar que la sesión está activa
                        sessionStorage.setItem('vendedor-session-active', 'true');
                    }
                    
                    App.ui.switchView(targetView);

                    // Load pedidos data in background after UI is ready
                    if (targetView === 'pedidos') {
                        // Start loading pedidos in background, no await
                        this.loadPedidosInBackground();
                    }
                    
                    // Limpiar sesión cuando se cierre la ventana/pestaña
                    window.addEventListener('beforeunload', () => {
                        // Limpiar todos los intervalos y requests
                        App.components.Dashboard.cleanup();
                        App.components.Pedidos.stopPolling();
                        
                        // Solo limpiar si no es un refresh (reload)
                        if (!performance.navigation || performance.navigation.type !== 1) {
                            sessionStorage.removeItem('vendedor-session-active');
                        }
                    });
                },
                
                async loadPedidosInBackground() {
                    // Simple background loading without complex logging
                    setTimeout(async () => {
                        try {
                            await App.components.Pedidos.loadPedidos();
                            // Start polling only after first load is complete
                            App.components.Pedidos.startPolling();
                        } catch (error) {
                            Logger.error('Pedidos', 'Background loading failed', error);
                        }
                    }, 100); // 100ms delay to let UI render
                }
            },
            
            /* ------------------------------------------------------Pedidos ------------------------------------------------------------------------------*/
            /* ------------------------------------------------------Pedidos ------------------------------------------------------------------------------*/






            // ...
            // --- VISTA DE PEDIDOS AHORA INCLUYE EL HEADER ---
            Pedidos: {
                render(data) {
                    const tienda = App.state.tienda;
                    const statusConfig = {
                        PENDIENTE:  { label: 'En Revisión', icon: 'fas fa-clock', colors: 'bg-amber-100 text-amber-800' },
                        ACTIVA:     { label: 'Activa', icon: 'fas fa-check-circle', colors: 'bg-green-100 text-green-800' },
                        INACTIVA:   { label: 'Inactiva', icon: 'fas fa-times-circle', colors: 'bg-red-100 text-red-800' },
                    };
                    const status = statusConfig[tienda.estado] || {};
                    const statusHtml = `<span class="px-2 py-0.5 text-xs font-semibold rounded-full ${status.colors} inline-flex items-center gap-1.5"><i class="${status.icon}"></i>${status.label}</span>`;
                    const ventasHoy = (tienda.ventasHoy || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
                    const pedidosNuevos = tienda.pedidosNuevos || 0;
                    const pedidosCompletados = tienda.pedidosCompletados || 0;
                    const estaAbierta = tienda.estaAbierta !== false;

                    return `
                        <div id="view-pedidos" class="main-view">
                            <!-- Header compacto con prioridad en pedidos -->
                            <header class="bg-white p-3 sticky top-0 z-30 rounded-b-xl shadow-md mb-3">
                                <!-- Fila 1: Info básica + Control de tienda en una sola línea -->
                                <div class="flex items-center justify-between mb-3">
                                    <div class="flex items-center gap-2">
                                        <img src="${tienda.logoUrl || '/img/logo-placeholder.svg'}" alt="Logo" class="w-8 h-8 rounded-full object-cover border border-slate-200">
                                        <div>
                                            <h1 class="text-sm font-bold text-slate-800 leading-tight">${tienda.nombre}</h1>
                                            <div class="flex items-center gap-2">
                                                <div class="w-2 h-2 rounded-full ${estaAbierta ? 'bg-green-500' : 'bg-red-500'} animate-pulse"></div>
                                                <span class="text-xs font-medium ${estaAbierta ? 'text-green-600' : 'text-red-600'}">${estaAbierta ? 'ABIERTA' : 'CERRADA'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Botón de tienda compacto -->
                                    <button 
                                        id="btn-toggle-tienda" 
                                        onclick="window.toggleTiendaStatus()"
                                        class="px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 shadow-md
                                               ${estaAbierta ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}"
                                        data-estado="${estaAbierta}">
                                        <i class="fas ${estaAbierta ? 'fa-times' : 'fa-check'} mr-1"></i>
                                        ${estaAbierta ? 'Cerrar' : 'Abrir'}
                                    </button>
                                </div>
                                
                                <!-- Fila 2: Estadísticas compactas -->
                                <div class="grid grid-cols-3 gap-2 text-center">
                                    <div class="bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                                        <p class="text-xs font-medium text-emerald-600">Ventas</p>
                                        <p class="text-sm font-bold text-emerald-800">${ventasHoy}</p>
                                    </div>
                                    <div class="bg-amber-50 p-2 rounded-lg border border-amber-100">
                                        <p class="text-xs font-medium text-amber-600">Nuevos</p>
                                        <p class="text-sm font-bold text-amber-800">${pedidosNuevos}</p>
                                    </div>
                                    <div class="bg-blue-50 p-2 rounded-lg border border-blue-100">
                                        <p class="text-xs font-medium text-blue-600">Hechos</p>
                                        <p class="text-sm font-bold text-blue-800">${pedidosCompletados}</p>
                                    </div>
                                </div>
                            </header>
                            
                            <!-- Área principal para pedidos (más espacio) -->
                            <div id="pedidos-container" class="px-3 space-y-3">
                                <div class="bg-white p-6 rounded-xl shadow-md text-center">
                                    <i class="fas fa-spinner fa-spin text-2xl text-indigo-400 mb-3"></i>
                                    <p class="mt-2 text-slate-500">Cargando pedidos...</p>
                                </div>
                            </div>
                        </div>`;
                },
                
                async init(data) {
                    const container = document.getElementById('pedidos-container');
                    if (!container) return;

                    container.removeEventListener('click', this.handlePedidoAction.bind(this));
                    container.addEventListener('click', this.handlePedidoAction.bind(this));

                    // Cargar estadísticas del header
                    try {
                        const response = await fetch('/api/vendedor/dashboard');
                        if (response.ok) {
                            const data = await response.json();
                            
                            // Actualizar el estado global de la tienda con datos frescos
                            if (data.tienda) {
                                App.state.tienda = data.tienda;
                                App.state.tienda.ventasHoy = data.ventasHoy;
                                App.state.tienda.pedidosNuevos = data.pedidosNuevos;
                                App.state.tienda.pedidosCompletados = data.pedidosCompletados;
                            }
                            
                            // Mostrar ventas del día
                            const ventasElement = document.querySelector('.text-emerald-800');
                            if (ventasElement) {
                                ventasElement.textContent = data.ventasHoy || 0;
                            }
                            
                            // Mostrar pedidos nuevos
                            const nuevosElement = document.querySelector('.text-amber-800');
                            if (nuevosElement) {
                                nuevosElement.textContent = data.pedidosNuevos || 0;
                            }
                            
                            // Mostrar pedidos completados
                            const completadosElement = document.querySelector('.text-blue-800');
                            if (completadosElement) {
                                completadosElement.textContent = data.pedidosCompletados || 0;
                            }
                            
                            console.log('🏪 Estadísticas del header actualizadas');
                        }
                    } catch (error) {
                        console.error('Error cargando estadísticas:', error);
                    }

                    await this.loadPedidos();
                    
                    // Configurar actualización automática de estadísticas cada 30 segundos
                    this.startEstadisticasPolling();
                },

                startEstadisticasPolling() {
                    // Don't start multiple polling intervals
                    if (App.state.estadisticasPolling) return;
                    
                    App.state.estadisticasPolling = setInterval(async () => {
                        await this.actualizarEstadisticas();
                    }, 30000); // 30 segundos
                    
                    console.log('📊 Actualización automática de estadísticas configurada (cada 30 segundos)');
                },

                stopEstadisticasPolling() {
                    if (App.state.estadisticasPolling) {
                        clearInterval(App.state.estadisticasPolling);
                        App.state.estadisticasPolling = null;
                        console.log('📊 Polling de estadísticas detenido');
                    }
                },

                // Función para limpiar todos los intervalos y requests pendientes
                cleanup() {
                    this.stopEstadisticasPolling();
                    // Agregar cleanup adicional si es necesario
                },

                // Función para actualizar solo las estadísticas
                async actualizarEstadisticas() {
                    try {
                        const response = await fetch('/api/vendedor/dashboard');
                        if (response.ok) {
                            const data = await response.json();
                            
                            // Actualizar el estado global de la tienda con datos frescos
                            if (data.tienda) {
                                App.state.tienda = data.tienda;
                                App.state.tienda.ventasHoy = data.ventasHoy;
                                App.state.tienda.pedidosNuevos = data.pedidosNuevos;
                                App.state.tienda.pedidosCompletados = data.pedidosCompletados;
                            }
                            
                            // Actualizar ventas del día
                            const ventasElement = document.querySelector('.text-emerald-800');
                            if (ventasElement) {
                                ventasElement.textContent = data.ventasHoy || 0;
                            }
                            
                            // Actualizar pedidos nuevos
                            const nuevosElement = document.querySelector('.text-amber-800');
                            if (nuevosElement) {
                                nuevosElement.textContent = data.pedidosNuevos || 0;
                            }
                            
                            // Actualizar pedidos completados
                            const completadosElement = document.querySelector('.text-blue-800');
                            if (completadosElement) {
                                completadosElement.textContent = data.pedidosCompletados || 0;
                            }
                            
                            // Actualizar el botón del estado de la tienda si hay cambios
                            const storeBtn = document.getElementById('store-status-btn');
                            if (storeBtn && data.tienda) {
                                this.updateStoreButton(storeBtn, data.tienda.estaAbierta);
                            }
                            
                            console.log('📊 Estadísticas actualizadas:', {
                                ventas: data.ventasHoy,
                                nuevos: data.pedidosNuevos, 
                                completados: data.pedidosCompletados,
                                estaAbierta: data.tienda?.estaAbierta
                            });
                        }
                    } catch (error) {
                        console.error('Error actualizando estadísticas:', error);
                    }
                },

                initNonBlocking(data) {
                    const container = document.getElementById('pedidos-container');
                    if (!container) return;

                    // Show initial loading state
                    container.innerHTML = `
                        <div class="bg-white p-6 rounded-xl shadow-md text-center">
                            <i class="fas fa-spinner fa-spin text-2xl text-indigo-500 mb-3"></i>
                            <p class="text-slate-600">Cargando pedidos...</p>
                        </div>
                    `;

                    container.removeEventListener('click', this.handlePedidoAction.bind(this));
                    container.addEventListener('click', this.handlePedidoAction.bind(this));
                },

                async loadPedidos(forceReload = false) {
                    const container = document.getElementById('pedidos-container');
                    if (!container) return;

                    // Show loading indicator if it's a forced reload (cambio de vista)
                    const isFirstLoad = container.innerHTML.includes('Cargando pedidos...');
                    let syncIndicator = null;
                    
                    if (forceReload) {
                        // Mostrar loader inmediatamente para cambio de vista
                        container.innerHTML = `
                            <div class="bg-white p-6 rounded-xl shadow-md text-center">
                                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
                                <p class="text-slate-600">
                                    <i class="fas fa-sync-alt mr-2"></i>Actualizando pedidos...
                                </p>
                            </div>
                        `;
                    } else if (App.state.isUserActive && !isFirstLoad) {
                        syncIndicator = this.showSyncIndicator();
                    }

                    try {
                        const response = await fetch(App.config.apiEndpoints.getPedidos);
                        if (!response.ok) throw new Error('No se pudieron cargar los pedidos.');
                        const pedidos = await response.json();
                        
                        // Check if there are actual changes before updating UI
                        const hasChanges = App.ui.checkForPedidosChanges(pedidos);
                        
                        if (hasChanges || isFirstLoad || forceReload) {
                            // Reset counter and speed up polling when there are changes
                            App.state.consecutiveNoChanges = 0;
                            App.state.lastActivityTime = Date.now();
                            this.adjustPollingSpeed(true);
                            
                            // Check for new orders and show notification (but not on first load or forced reload)
                            if (!isFirstLoad && !forceReload) {
                                App.ui.showNewOrderNotification(pedidos.length);
                            }
                            
                            // Update UI if there are changes or it's first load
                            this.renderPedidos(pedidos, container);
                        } else {
                            // Increment counter and slow down polling when no changes
                            App.state.consecutiveNoChanges++;
                            this.adjustPollingSpeed(false);
                        }
                        
                        return pedidos;
                    } catch (error) {
                        const errorMsg = isFirstLoad || forceReload ? 
                            `<div class="bg-white p-6 rounded-xl shadow-md text-center text-red-500">
                                <i class="fas fa-exclamation-triangle text-2xl mb-3"></i>
                                <p>Error al cargar pedidos</p>
                                <button onclick="App.components.Pedidos.loadPedidos(true)" class="mt-3 bg-red-500 text-white px-4 py-2 rounded-lg">
                                    <i class="fas fa-redo mr-2"></i>Reintentar
                                </button>
                            </div>` :
                            `<div class="bg-white p-6 rounded-xl shadow-md text-center text-red-500"><p>${error.message}</p></div>`;
                        
                        container.innerHTML = errorMsg;
                        return [];
                    } finally {
                        // Hide sync indicator when request is complete
                        if (syncIndicator) {
                            this.hideSyncIndicator(syncIndicator);
                        }
                    }
                },

                showSyncIndicator() {
                    // Only show if user is actively looking at the page
                    if (!App.state.isUserActive || document.hidden) return null;
                    
                    const indicator = document.createElement('div');
                    indicator.id = 'sync-indicator';
                    indicator.className = 'fixed top-20 right-5 bg-blue-500 text-white text-xs px-3 py-1 rounded-full shadow-lg z-50 opacity-75 transition-opacity duration-300';
                    indicator.innerHTML = `<i class="fas fa-sync-alt fa-spin mr-1"></i>Sincronizando...`;
                    
                    // Remove any existing indicator
                    const existing = document.getElementById('sync-indicator');
                    if (existing) existing.remove();
                    
                    document.body.appendChild(indicator);
                    return indicator;
                },

                hideSyncIndicator(indicator) {
                    if (indicator) {
                        indicator.style.opacity = '0';
                        setTimeout(() => {
                            if (indicator.parentNode) {
                                indicator.parentNode.removeChild(indicator);
                            }
                        }, 300);
                    }
                },

                adjustPollingSpeed(hasChanges) {
                    // Check user activity - but be more lenient for active periods
                    const timeSinceLastInteraction = Date.now() - App.state.lastUserInteraction;
                    const twoMinutes = 2 * 60 * 1000;
                    const fiveMinutes = 5 * 60 * 1000;
                    
                    if (timeSinceLastInteraction > fiveMinutes) {
                        // Slow down only after 5 minutes of inactivity
                        App.state.pollingInterval = App.state.maxPollingInterval; // 30 seconds
                        App.state.isUserActive = false;
                        console.log('⏱️ Usuario inactivo > 5min - polling cada 30s');
                    } else if (timeSinceLastInteraction > twoMinutes) {
                        // Moderate speed after 2 minutes
                        App.state.pollingInterval = 10000; // 10 seconds
                        App.state.isUserActive = true;
                        console.log('⏱️ Usuario semi-activo - polling cada 10s');
                    } else if (hasChanges) {
                        // ULTRA FAST when there are changes (new orders coming!)
                        App.state.pollingInterval = App.state.minPollingInterval; // 3 seconds
                        App.state.isUserActive = true;
                        App.state.consecutiveNoChanges = 0; // Reset counter
                        console.log('🚀 CAMBIOS DETECTADOS - polling ultra rápido cada 3s');
                    } else {
                        // Graduated slow-down when no changes, but still keep it fast initially
                        if (App.state.consecutiveNoChanges === 0) {
                            // First check without changes - stay fast
                            App.state.pollingInterval = 5000; // 5 seconds
                            console.log('⚡ Primera verificación sin cambios - polling cada 5s');
                        } else if (App.state.consecutiveNoChanges <= 2) {
                            // First 2 checks without changes - moderate speed
                            App.state.pollingInterval = 7000; // 7 seconds
                            console.log('🔍 Buscando nuevos pedidos - polling cada 7s');
                        } else if (App.state.consecutiveNoChanges <= 5) {
                            // 3-5 checks without changes - normal speed
                            App.state.pollingInterval = 10000; // 10 seconds
                            console.log('⏱️ Polling normal - cada 10s');
                        } else {
                            // More than 5 checks without changes - gradual slowdown
                            const slowDownFactor = Math.min(App.state.consecutiveNoChanges - 5, 2); // Max 2x slower
                            App.state.pollingInterval = Math.min(
                                10000 + (slowDownFactor * 5000), // 10s + up to 10s more
                                App.state.maxPollingInterval
                            );
                            console.log(`🐌 Sin cambios por ${App.state.consecutiveNoChanges} veces - polling cada ${App.state.pollingInterval/1000}s`);
                        }
                        App.state.isUserActive = true;
                    }
                    
                    // Restart polling with new interval
                    if (App.state.isPollingActive) {
                        this.restartPolling();
                    }
                },

                restartPolling() {
                    // Clear current interval
                    if (App.state.pedidosPolling) {
                        clearInterval(App.state.pedidosPolling);
                    }
                    
                    // Start new interval with updated speed
                    App.state.pedidosPolling = setInterval(async () => {
                        if (App.state.currentView === 'pedidos') {
                            await this.loadPedidos();
                        }
                    }, App.state.pollingInterval);
                },

                startPolling() {
                    // Don't start multiple polling intervals
                    if (App.state.pedidosPolling) return;
                    
                    App.state.isPollingActive = true;
                    App.state.consecutiveNoChanges = 0; // Reset counter
                    App.state.pollingInterval = 5000; // Start FAST - 5 seconds for detecting new orders quickly
                    App.state.lastUserInteraction = Date.now(); // Reset user activity
                    
                    console.log('🚀 Iniciando polling RÁPIDO cada 5 segundos para detectar nuevos pedidos');
                    
                    // Start with FAST polling to catch new orders quickly
                    App.state.pedidosPolling = setInterval(async () => {
                        if (App.state.currentView === 'pedidos') {
                            await this.loadPedidos();
                        }
                    }, App.state.pollingInterval);
                },

                stopPolling() {
                    if (App.state.pedidosPolling) {
                        clearInterval(App.state.pedidosPolling);
                        App.state.pedidosPolling = null;
                        // Removed console.log to reduce noise
                    }
                    
                    App.state.isPollingActive = false;
                    App.state.consecutiveNoChanges = 0;
                    App.state.pollingInterval = App.state.minPollingInterval; // Reset to fast for next time
                    
                    // Clear notification dot when viewing pedidos
                    const pedidosTab = document.querySelector('.nav-link[data-target="pedidos"]');
                    const notificationDot = pedidosTab?.querySelector('.notification-dot');
                    if (notificationDot) {
                        notificationDot.remove();
                    }
                },

                renderPedidos(pedidos, container) {
                    // Filtrar solo pedidos activos (nuevos y en preparación)
                    const pedidosActivos = pedidos.filter(p => 
                        p.estado === 'PENDIENTE' || p.estado === 'EN_PREPARACION' || p.estado === 'LISTO_PARA_RECOGER'
                    );
                    
                    // Contar pedidos completados/cancelados para el historial
                    const pedidosHistoricos = pedidos.filter(p => 
                        p.estado === 'COMPLETADO' || p.estado === 'CANCELADO'
                    );

                    if (pedidosActivos.length === 0) {
                        container.innerHTML = `
                            <div class="mb-4 flex justify-between items-center">
                                <h2 class="text-xl font-bold text-slate-800">
                                    <i class="fas fa-clock text-orange-500 mr-2"></i>Pedidos (0)
                                </h2>
                                <div class="flex gap-2">
                                    <button id="refresh-pedidos" class="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-2 rounded-lg transition-colors text-sm" title="Actualizar pedidos">
                                        <i class="fas fa-sync-alt mr-1"></i>Actualizar
                                    </button>
                                    ${pedidosHistoricos.length > 0 ? `
                                        <button id="ver-historial-pedidos" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg transition-colors text-sm">
                                            <i class="fas fa-history mr-1"></i>Ver Historial (${pedidosHistoricos.length})
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="bg-white p-6 rounded-xl shadow-md text-center">
                                <i class="fas fa-receipt text-4xl text-indigo-400 mb-3"></i>
                                <h3 class="text-xl font-bold">Pedidos</h3>
                                <p class="mt-2 text-slate-500">No tienes pedidos pendientes en este momento.</p>
                            </div>
                        `;
                        this.attachHistorialHandler(pedidos);
                        return;
                    }

                    const formatPrice = (price) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);
                    
                    container.innerHTML = `
                        <div class="mb-4 flex justify-between items-center">
                            <h2 class="text-xl font-bold text-slate-800">
                                <i class="fas fa-clock text-orange-500 mr-2"></i>Pedidos (${pedidosActivos.length})
                            </h2>
                            <div class="flex gap-2">
                                <button id="refresh-pedidos" class="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-2 rounded-lg transition-colors text-sm" title="Actualizar pedidos">
                                    <i class="fas fa-sync-alt mr-1"></i>Actualizar
                                </button>
                                ${pedidosHistoricos.length > 0 ? `
                                    <button id="ver-historial-pedidos" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg transition-colors text-sm">
                                        <i class="fas fa-history mr-1"></i>Ver Historial (${pedidosHistoricos.length})
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                        <div class="space-y-4">
                            ${pedidosActivos.map(pedido => {
                                const statusConfig = {
                                    'PENDIENTE': { text: 'Nuevo Pedido', colors: 'bg-amber-100 text-amber-800', icon: 'fas fa-exclamation-circle' },
                                    'EN_PREPARACION': { text: 'En Preparación', colors: 'bg-blue-100 text-blue-800', icon: 'fas fa-clock' },
                                    'LISTO_PARA_RECOGER': { text: 'Listo para Recoger', colors: 'bg-green-100 text-green-800', icon: 'fas fa-check-circle' }
                                };
                                const currentStatus = statusConfig[pedido.estado] || {};

                                let actionButtons = '';
                                if (pedido.estado === 'PENDIENTE') {
                                    actionButtons = `
                                        <button class="bg-red-100 hover:bg-red-200 text-red-700 font-semibold px-3 py-1 rounded-lg text-sm transition-colors" data-action="cancelar" data-id="${pedido.id}">
                                            <i class="fas fa-times mr-1"></i>Rechazar
                                        </button>
                                        <button class="bg-green-500 hover:bg-green-600 text-white font-semibold px-3 py-1 rounded-lg text-sm transition-colors" data-action="aceptar" data-id="${pedido.id}">
                                            <i class="fas fa-check mr-1"></i>Aceptar
                                        </button>`;
                                } else if (pedido.estado === 'EN_PREPARACION') {
                                    actionButtons = `<button class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1 rounded-lg text-sm w-full transition-colors" data-action="listo" data-id="${pedido.id}">
                                        <i class="fas fa-utensils mr-1"></i>Marcar como Listo
                                    </button>`;
                                } else if (pedido.estado === 'LISTO_PARA_RECOGER') {
                                    actionButtons = `<button class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1 rounded-lg text-sm w-full transition-colors" data-action="entregado" data-id="${pedido.id}">
                                        <i class="fas fa-handshake mr-1"></i>Marcar como Entregado
                                    </button>`;
                                }

                                return `
                                <div class="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow border-l-4 ${pedido.estado === 'PENDIENTE' ? 'border-amber-400' : pedido.estado === 'EN_PREPARACION' ? 'border-blue-400' : 'border-green-400'}" data-pedido-id="${pedido.id}">
                                    <div class="flex justify-between items-start mb-3">
                                        <div>
                                            <p class="font-bold text-slate-800">
                                                <i class="fas fa-receipt text-indigo-500 mr-1"></i>
                                                Pedido #${pedido.id} - <span class="font-normal">${pedido.nombreComprador}</span>
                                            </p>
                                            <p class="text-xs text-slate-500">
                                                <i class="fas fa-calendar-alt mr-1"></i>
                                                ${new Date(pedido.fechaCreacion).toLocaleString()}
                                            </p>
                                        </div>
                                        <span class="status-badge px-3 py-1 text-xs font-semibold rounded-full ${currentStatus.colors}">
                                            <i class="${currentStatus.icon} mr-1"></i>${currentStatus.text}
                                        </span>
                                    </div>
                                    
                                    <!-- Información de Entrega y Pago -->
                                    <div class="mb-3 grid grid-cols-2 gap-2">
                                        <div class="bg-teal-50 border border-teal-200 rounded-lg p-2">
                                            <p class="text-xs font-semibold text-teal-800 mb-1">
                                                <i class="fas fa-truck text-teal-600 mr-1"></i>Entrega
                                            </p>
                                            <p class="text-sm font-medium text-teal-700">
                                                ${pedido.tipoEntrega === 'domicilio' ? '🏠 Domicilio' : '🏪 Recoger'}
                                            </p>
                                        </div>
                                        <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                                            <p class="text-xs font-semibold text-emerald-800 mb-1">
                                                <i class="fas fa-credit-card text-emerald-600 mr-1"></i>Pago
                                            </p>
                                            <p class="text-sm font-medium text-emerald-700">
                                                ${pedido.tipoPago === 'efectivo' ? '💵 Efectivo' : '📱 Transferencia'}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <!-- Notas si existen -->
                                    ${(pedido.notasGenerales || pedido.notasDomicilio) ? `
                                    <div class="mb-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                        <p class="text-xs font-semibold text-amber-800 mb-2">
                                            <i class="fas fa-sticky-note text-amber-600 mr-1"></i>Notas del Cliente
                                        </p>
                                        ${pedido.notasGenerales ? `<p class="text-sm text-amber-700 mb-1"><strong>General:</strong> ${pedido.notasGenerales}</p>` : ''}
                                        ${pedido.notasDomicilio && pedido.tipoEntrega === 'domicilio' ? `<p class="text-sm text-amber-700"><strong>Domicilio:</strong> ${pedido.notasDomicilio}</p>` : ''}
                                    </div>
                                    ` : ''}

                                    <div class="border-t border-b py-3 space-y-2">
                                        ${pedido.detalles.map(d => `
                                            <div class="flex justify-between text-sm">
                                                <div class="text-slate-600">
                                                    <span class="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-semibold mr-2">${d.cantidad}x</span>
                                                    <span class="font-medium">${d.nombreProducto}</span>
                                                    ${d.opcionesSeleccionadas ? `<div class="text-xs text-slate-500 mt-1 ml-8">• ${d.opcionesSeleccionadas}</div>` : ''}
                                                </div>
                                                <span class="text-slate-700 font-medium">${formatPrice(d.precioUnitario * d.cantidad)}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                    <div class="pt-3 flex justify-between items-center">
                                        <p class="font-bold text-lg text-slate-800">
                                            <i class="fas fa-dollar-sign text-green-600 mr-1"></i>
                                            Total: ${formatPrice(pedido.total)}
                                        </p>
                                        <div class="flex gap-2">${actionButtons}</div>
                                    </div>
                                </div>`;
                            }).join('')}
                        </div>
                    `;
                    
                    this.attachHistorialHandler(pedidos);
                },

                attachHistorialHandler(todosLosPedidos) {
                    // Handler para historial
                    const historialBtn = document.getElementById('ver-historial-pedidos');
                    if (historialBtn) {
                        historialBtn.addEventListener('click', () => {
                            this.mostrarHistorialPedidos(todosLosPedidos);
                        });
                    }
                    
                    // Handler para botón de refresh
                    const refreshBtn = document.getElementById('refresh-pedidos');
                    if (refreshBtn) {
                        refreshBtn.addEventListener('click', async () => {
                            // Agregar animación de loading al botón
                            const originalHTML = refreshBtn.innerHTML;
                            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Actualizando...';
                            refreshBtn.disabled = true;
                            
                            try {
                                // Forzar recarga de pedidos
                                await App.components.Pedidos.loadPedidos(true);
                                
                                // Feedback visual de éxito
                                refreshBtn.innerHTML = '<i class="fas fa-check mr-1"></i>Actualizado';
                                setTimeout(() => {
                                    refreshBtn.innerHTML = originalHTML;
                                    refreshBtn.disabled = false;
                                }, 1500);
                            } catch (error) {
                                // Feedback visual de error
                                refreshBtn.innerHTML = '<i class="fas fa-exclamation-triangle mr-1"></i>Error';
                                setTimeout(() => {
                                    refreshBtn.innerHTML = originalHTML;
                                    refreshBtn.disabled = false;
                                }, 2000);
                            }
                        });
                    }
                },

                mostrarHistorialPedidos(todosLosPedidos) {
                    // Filtrar pedidos históricos
                    const pedidosHistoricos = todosLosPedidos.filter(p => 
                        p.estado === 'COMPLETADO' || p.estado === 'CANCELADO'
                    ).sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));

                    const formatPrice = (price) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);
                    
                    // Crear modal para mostrar el historial
                    const modalHTML = `
                        <div id="historial-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div class="bg-white rounded-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
                                <div class="p-6 border-b border-gray-200 flex justify-between items-center">
                                    <h2 class="text-2xl font-bold text-slate-800">
                                        <i class="fas fa-history text-slate-600 mr-2"></i>
                                        Historial de Pedidos
                                    </h2>
                                    <button id="cerrar-historial" class="text-gray-500 hover:text-gray-700 text-2xl">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                                <div class="p-6 overflow-y-auto max-h-[70vh]">
                                    ${pedidosHistoricos.length === 0 ? `
                                        <div class="text-center py-8">
                                            <i class="fas fa-inbox text-4xl text-gray-400 mb-4"></i>
                                            <p class="text-gray-500">No hay pedidos en el historial.</p>
                                        </div>
                                    ` : `
                                        <div class="grid gap-4">
                                            ${pedidosHistoricos.map(pedido => {
                                                const statusConfig = {
                                                    'COMPLETADO': { text: 'Completado', colors: 'bg-green-100 text-green-800', icon: 'fas fa-check-circle' },
                                                    'CANCELADO': { text: 'Cancelado', colors: 'bg-red-100 text-red-800', icon: 'fas fa-times-circle' }
                                                };
                                                const currentStatus = statusConfig[pedido.estado] || {};
                                                
                                                const totalVentas = pedido.estado === 'COMPLETADO' ? pedido.total : 0;
                                                
                                                return `
                                                    <div class="bg-gray-50 p-4 rounded-lg border ${pedido.estado === 'COMPLETADO' ? 'border-green-200' : 'border-red-200'}">
                                                        <div class="flex justify-between items-start mb-3">
                                                            <div>
                                                                <p class="font-semibold text-slate-800">
                                                                    <i class="fas fa-receipt text-slate-500 mr-1"></i>
                                                                    Pedido #${pedido.id} - ${pedido.nombreComprador}
                                                                </p>
                                                                <p class="text-sm text-slate-500">
                                                                    <i class="fas fa-calendar mr-1"></i>
                                                                    ${new Date(pedido.fechaCreacion).toLocaleString()}
                                                                </p>
                                                            </div>
                                                            <span class="px-3 py-1 text-xs font-semibold rounded-full ${currentStatus.colors}">
                                                                <i class="${currentStatus.icon} mr-1"></i>${currentStatus.text}
                                                            </span>
                                                        </div>
                                                        
                                                        <!-- Info de entrega y pago en historial -->
                                                        <div class="mb-3 grid grid-cols-2 gap-2">
                                                            <div class="bg-white border rounded p-2">
                                                                <p class="text-xs text-slate-600">Entrega:</p>
                                                                <p class="text-sm font-medium">
                                                                    ${pedido.tipoEntrega === 'domicilio' ? '🏠 Domicilio' : '🏪 Recoger'}
                                                                </p>
                                                            </div>
                                                            <div class="bg-white border rounded p-2">
                                                                <p class="text-xs text-slate-600">Pago:</p>
                                                                <p class="text-sm font-medium">
                                                                    ${pedido.tipoPago === 'efectivo' ? '💵 Efectivo' : '📱 Transferencia'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        
                                                        <div class="text-sm space-y-1">
                                                            ${pedido.detalles.map(d => `
                                                                <div class="flex justify-between">
                                                                    <div class="text-slate-600">
                                                                        <span class="font-medium">${d.cantidad}x ${d.nombreProducto}</span>
                                                                        ${d.opcionesSeleccionadas ? `<div class="text-xs text-slate-500 mt-1">• ${d.opcionesSeleccionadas}</div>` : ''}
                                                                    </div>
                                                                    <span class="text-slate-700">${formatPrice(d.precioUnitario * d.cantidad)}</span>
                                                                </div>
                                                            `).join('')}
                                                        </div>
                                                        <div class="pt-2 mt-2 border-t border-gray-200 flex justify-between items-center">
                                                            <span class="font-bold text-slate-800">Total: ${formatPrice(pedido.total)}</span>
                                                            ${pedido.estado === 'COMPLETADO' ? 
                                                                `<span class="text-green-600 text-sm font-medium">
                                                                    <i class="fas fa-money-bill-wave mr-1"></i>Venta exitosa
                                                                </span>` : 
                                                                `<span class="text-red-600 text-sm font-medium">
                                                                    <i class="fas fa-ban mr-1"></i>No completado
                                                                </span>`
                                                            }
                                                        </div>
                                                    </div>
                                                `;
                                            }).join('')}
                                        </div>
                                        
                                        <!-- Resumen de estadísticas -->
                                        <div class="mt-6 pt-6 border-t border-gray-200">
                                            <h3 class="text-lg font-semibold text-slate-800 mb-4">
                                                <i class="fas fa-chart-bar text-indigo-500 mr-2"></i>Resumen de Estadísticas
                                            </h3>
                                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                ${(() => {
                                                    const completados = pedidosHistoricos.filter(p => p.estado === 'COMPLETADO');
                                                    const cancelados = pedidosHistoricos.filter(p => p.estado === 'CANCELADO');
                                                    const totalVentas = completados.reduce((sum, p) => sum + p.total, 0);
                                                    
                                                    return `
                                                        <div class="bg-green-50 p-4 rounded-lg text-center">
                                                            <i class="fas fa-check-circle text-2xl text-green-600 mb-2"></i>
                                                            <p class="text-sm text-green-700 font-medium">Pedidos Completados</p>
                                                            <p class="text-2xl font-bold text-green-800">${completados.length}</p>
                                                            <p class="text-xs text-green-600">${formatPrice(totalVentas)}</p>
                                                        </div>
                                                        <div class="bg-red-50 p-4 rounded-lg text-center">
                                                            <i class="fas fa-times-circle text-2xl text-red-600 mb-2"></i>
                                                            <p class="text-sm text-red-700 font-medium">Pedidos Cancelados</p>
                                                            <p class="text-2xl font-bold text-red-800">${cancelados.length}</p>
                                                            <p class="text-xs text-red-600">Sin ingresos</p>
                                                        </div>
                                                        <div class="bg-indigo-50 p-4 rounded-lg text-center">
                                                            <i class="fas fa-percentage text-2xl text-indigo-600 mb-2"></i>
                                                            <p class="text-sm text-indigo-700 font-medium">Tasa de Éxito</p>
                                                            <p class="text-2xl font-bold text-indigo-800">
                                                                ${pedidosHistoricos.length > 0 ? Math.round((completados.length / pedidosHistoricos.length) * 100) : 0}%
                                                            </p>
                                                            <p class="text-xs text-indigo-600">${pedidosHistoricos.length} pedidos totales</p>
                                                        </div>
                                                    `;
                                                })()}
                                            </div>
                                        </div>
                                    `}
                                </div>
                            </div>
                        </div>
                    `;

                    // Agregar modal al DOM
                    document.body.insertAdjacentHTML('beforeend', modalHTML);
                    
                    // Manejar el cierre del modal
                    const modal = document.getElementById('historial-modal');
                    const cerrarBtn = document.getElementById('cerrar-historial');
                    
                    const cerrarModal = () => {
                        modal.remove();
                    };
                    
                    cerrarBtn.addEventListener('click', cerrarModal);
                    modal.addEventListener('click', (e) => {
                        if (e.target === modal) cerrarModal();
                    });
                    
                    // Cerrar con ESC
                    document.addEventListener('keydown', function escHandler(e) {
                        if (e.key === 'Escape') {
                            cerrarModal();
                            document.removeEventListener('keydown', escHandler);
                        }
                    });
                },

                // Función para activar temporalmente polling super rápido
                activarPollingRapidoTemporal(duracionSegundos = 30) {
                    console.log(`⚡ ACTIVANDO POLLING SÚPER RÁPIDO por ${duracionSegundos} segundos`);
                    
                    // Guardar intervalo actual
                    const intervalOriginal = App.state.pollingInterval;
                    
                    // Activar polling ultra rápido (cada 2 segundos)
                    App.state.pollingInterval = 2000;
                    App.state.consecutiveNoChanges = 0;
                    
                    if (App.state.isPollingActive) {
                        this.restartPolling();
                    }
                    
                    // Restaurar velocidad normal después del tiempo especificado
                    setTimeout(() => {
                        console.log('🔄 Restaurando velocidad normal de polling');
                        App.state.pollingInterval = 5000; // Volver a velocidad base rápida
                        if (App.state.isPollingActive) {
                            this.restartPolling();
                        }
                    }, duracionSegundos * 1000);
                },

                async handlePedidoAction(e) {
                    const button = e.target.closest('button[data-action]');
                    if (!button) return;

                    // Mark user activity - speed up polling
                    App.state.lastActivityTime = Date.now();
                    App.state.consecutiveNoChanges = 0;
                    
                    // Activar polling súper rápido temporalmente después de una acción
                    this.activarPollingRapidoTemporal(60); // 60 segundos de polling rápido
                    
                    const { action, id } = button.dataset;
                    let endpoint = '';

                    switch(action) {
                        case 'aceptar': endpoint = App.config.apiEndpoints.aceptarPedido.replace('{id}', id); break;
                        case 'listo': endpoint = App.config.apiEndpoints.listoPedido.replace('{id}', id); break;
                        case 'entregado': endpoint = App.config.apiEndpoints.entregadoPedido.replace('{id}', id); break;
                        case 'cancelar': endpoint = App.config.apiEndpoints.cancelarPedido.replace('{id}', id); break;
                        default: return;
                    }

                    try {
                        await App.api.request(endpoint, { method: 'POST' }, button);
                        App.ui.showToast(`Pedido #${id} actualizado.`);
                        // Reload pedidos immediately to show changes
                        await App.components.Pedidos.loadPedidos();
                        // Actualizar estadísticas después de cambiar un pedido
                        await App.components.Dashboard.actualizarEstadisticas();
                    } catch (error) { /* ya manejado en App.api */ }
                },

                async handleStoreStatusToggle(e) {
                    console.log('🏪 Click en botón de estado de tienda detectado', e.target);
                    
                    const button = e.target.closest('#store-status-btn');
                    if (!button) {
                        console.error('❌ No se encontró el botón store-status-btn');
                        return;
                    }
                    
                    console.log('🏪 Botón encontrado:', button);
                    
                    const currentState = button.dataset.estaAbierta === 'true';
                    const newState = !currentState;
                    
                    console.log('🏪 Estado actual:', currentState, '-> Nuevo estado:', newState);
                    
                    // Mostrar estado de carga
                    const originalContent = button.innerHTML;
                    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cambiando...';
                    button.disabled = true;
                    
                    try {
                        console.log('🏪 Enviando petición al servidor...');
                        
                        const response = await fetch('/api/vendedor/tienda/estado', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ estaAbierta: newState })
                        });
                        
                        console.log('🏪 Respuesta del servidor:', response.status, response.statusText);
                        
                        if (response.ok) {
                            const statusText = newState ? 'abierta' : 'cerrada';
                            App.ui.showToast(`Tienda ${statusText} para recibir pedidos`, 'success');
                            
                            // Actualizar el botón
                            console.log('🏪 Actualizando botón a estado:', newState);
                            this.updateStoreButton(button, newState);
                            
                            // Actualizar el estado global
                            if (App.state.tienda) {
                                App.state.tienda.estaAbierta = newState;
                            }
                            
                            console.log('🏪 Estado de tienda actualizado exitosamente:', { estaAbierta: newState });
                        } else {
                            const errorText = await response.text();
                            console.error('❌ Error del servidor:', errorText);
                            throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
                        }
                        
                    } catch (error) {
                        console.error('❌ Error al cambiar estado de tienda:', error);
                        App.ui.showToast('Error al cambiar el estado de la tienda', 'error');
                        // Restaurar contenido original
                        button.innerHTML = originalContent;
                    } finally {
                        button.disabled = false;
                    }
                },

                // Función para actualizar el botón de estado de tienda
                updateStoreButton(button, isOpen) {
                    console.log('🏪 updateStoreButton llamada con:', { button, isOpen });
                    
                    if (!button) {
                        console.error('❌ updateStoreButton: botón es null o undefined');
                        return;
                    }
                    
                    // Actualizar dataset
                    button.dataset.estaAbierta = isOpen;
                    console.log('🏪 Dataset actualizado:', button.dataset.estaAbierta);
                    
                    // Actualizar contenido
                    const newContent = `
                        <i class="fas ${isOpen ? 'fa-store-alt' : 'fa-times-circle'}"></i>
                        ${isOpen ? 'Cerrar Tienda' : 'Abrir Tienda'}
                    `;
                    button.innerHTML = newContent;
                    console.log('🏪 Contenido actualizado:', newContent.trim());
                    
                    // Actualizar clases
                    const newClassName = `${isOpen ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'} 
                                       px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center gap-2`;
                    button.className = newClassName;
                    console.log('🏪 Clases actualizadas:', button.className);
                    
                    console.log('🏪 Botón actualizado completamente. Estado final:', {
                        estaAbierta: button.dataset.estaAbierta,
                        innerHTML: button.innerHTML,
                        className: button.className
                    });
                }
            },
// ...






            /* ------------------------------------------------------Pedidos ------------------------------------------------------------------------------*/
            /* ------------------------------------------------------Pedidos ------------------------------------------------------------------------------*/
            
            Productos: {
                render(data) {
                    const emptyStateHtml = `
                        <div class="col-span-full bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl shadow-lg border border-slate-200 text-center">
                            <div class="w-16 h-16 bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                <i class="fas fa-utensils text-2xl text-orange-500"></i>
                            </div>
                            <h2 class="text-lg font-black text-slate-800 mb-2">Tu menú está vacío</h2>
                            <p class="text-slate-500 mb-3 text-sm">¡Es hora de crear productos increíbles!</p>
                            <div class="w-8 h-0.5 bg-gradient-to-r from-orange-400 to-red-500 rounded-full mx-auto"></div>
                        </div>`;
                    
                    const productosHtml = data.productos.length > 0 ? this.renderProductsList(data.productos) : emptyStateHtml;
                    
                    return `
                        <div id="view-productos" class="main-view p-4">
                            <header class="mb-4">
                                <div class="flex items-center justify-between mb-3">
                                    <div>
                                        <h1 class="text-xl font-black text-slate-800">🍽️ Mis Productos</h1>
                                        <p class="text-slate-500 text-xs">${data.productos.length} producto${data.productos.length !== 1 ? 's' : ''} en tu menú</p>
                                    </div>
                                    <div class="flex space-x-2">
                                        <button id="view-toggle-btn" class="w-9 h-9 bg-gradient-to-r from-orange-100 to-red-100 rounded-xl flex items-center justify-center hover:scale-110 transition-transform shadow-md">
                                            <i class="fas ${App.state.productViewMode === 'compact' ? 'fa-th-large' : 'fa-list'} text-orange-600 text-sm"></i>
                                        </button>
                                        <button class="w-9 h-9 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl flex items-center justify-center hover:scale-110 transition-transform shadow-md">
                                            <i class="fas fa-filter text-gray-600 text-sm"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="w-full h-0.5 bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 rounded-full"></div>
                            </header>
                            <div id="productos-container">
                                ${productosHtml}
                            </div>
                        </div>`;
                },

                renderProductsList(productos) {
                    if (App.state.productViewMode === 'compact') {
                        return this.renderCompactView(productos);
                    } else {
                        return this.renderCardView(productos);
                    }
                },

                renderCompactView(productos) {
                    return `<div class="space-y-2">${productos.map(p => {
                        const formattedPrice = (p.precio || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
                        const isDisabled = p.disponible === false;
                        return `
                            <div class="product-item bg-white rounded-xl shadow-sm border border-slate-100 p-3 flex items-center gap-3 hover:shadow-md transition-all duration-200 ${isDisabled ? 'opacity-60' : ''}" data-product-id="${p.id}">
                                <div class="relative">
                                    <img src="${p.imagenUrl || '/img/placeholder.svg'}" alt="${p.nombre}" class="w-12 h-12 rounded-lg object-cover ${isDisabled ? 'grayscale' : ''}">
                                    ${isDisabled ? '<div class="absolute inset-0 bg-red-500/10 rounded-lg flex items-center justify-center"><span class="text-red-500 text-xs font-bold">!</span></div>' : ''}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <h3 class="font-semibold text-sm text-slate-800 truncate">${p.nombre}</h3>
                                    <p class="text-xs text-slate-500 truncate">${p.descripcion || 'Sin descripción'}</p>
                                    <div class="flex items-center gap-2 mt-1">
                                        <span class="text-sm font-bold text-orange-600">${formattedPrice}</span>
                                        <div class="flex items-center gap-1">
                                            <div class="w-1.5 h-1.5 rounded-full ${!isDisabled ? 'bg-green-400' : 'bg-red-400'}"></div>
                                            <span class="text-xs ${!isDisabled ? 'text-green-600' : 'text-red-600'}">
                                                ${!isDisabled ? 'Disponible' : 'Deshabilitado'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex items-center gap-1">
                                    <button data-action="edit" class="w-8 h-8 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors">
                                        <i class="fas fa-edit text-blue-600 text-xs"></i>
                                    </button>
                                    <button data-action="delete" class="w-8 h-8 bg-orange-50 hover:bg-orange-100 rounded-lg flex items-center justify-center transition-colors">
                                        <i class="fas fa-eye-slash text-orange-600 text-xs"></i>
                                    </button>
                                </div>
                            </div>`;
                    }).join('')}</div>`;
                },

                renderCardView(productos) {
                    return `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">${productos.map(p => {
                        const formattedPrice = (p.precio || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
                        const isDisabled = p.disponible === false;
                        return `
                            <div class="product-card group bg-white rounded-3xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 border border-slate-100 ${isDisabled ? 'opacity-60 grayscale' : ''}" data-product-id="${p.id}">
                                <div class="relative overflow-hidden">
                                    <img src="${p.imagenUrl || '/img/placeholder.svg'}" alt="${p.nombre}" class="w-full h-24 object-cover group-hover:scale-110 transition-transform duration-500">
                                    <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    ${isDisabled ? '<div class="absolute inset-0 bg-red-500/20 flex items-center justify-center"><span class="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">DESHABILITADO</span></div>' : ''}
                                    <div class="absolute top-2 right-2 flex space-x-1">
                                        <button data-action="edit" class="w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-blue-500 hover:text-white transform hover:scale-110 shadow-lg">
                                            <i class="fas fa-edit text-xs"></i>
                                        </button>
                                        <button data-action="delete" class="w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-orange-500 hover:text-white transform hover:scale-110 shadow-lg">
                                            <i class="fas fa-eye-slash text-xs"></i>
                                        </button>
                                    </div>
                                    <div class="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <span class="bg-white/90 backdrop-blur-sm text-xs font-bold text-slate-700 px-2 py-1 rounded-full">
                                            ${p.categoria || 'General'}
                                        </span>
                                    </div>
                                </div>
                                <div class="p-4">
                                    <h3 class="font-bold text-base text-slate-800 truncate mb-1 group-hover:text-orange-600 transition-colors">${p.nombre}</h3>
                                    <p class="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">${p.descripcion || 'Sin descripción'}</p>
                                    <div class="flex items-center justify-between">
                                        <div class="flex flex-col">
                                            <span class="text-lg font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">${formattedPrice}</span>
                                            <span class="text-xs text-slate-400">Precio base</span>
                                        </div>
                                        <div class="flex items-center space-x-2">
                                            <div class="w-2 h-2 rounded-full ${!isDisabled ? 'bg-green-400' : 'bg-red-400'}"></div>
                                            <span class="text-xs font-medium ${!isDisabled ? 'text-green-600' : 'text-red-600'}">
                                                ${!isDisabled ? 'Disponible' : 'Deshabilitado'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>`;
                    }).join('')}</div>`;
                },
                init(data) {
                    App.ui.initModal('product-modal', () => {
                        document.getElementById('product-form')?.reset();
                        const preview = document.getElementById('image-preview');
                        if(preview) preview.src = '/img/placeholder.svg';
                        
                        App.components.Opciones.renderAsignacion(App.state.categorias, { categoriasDeOpciones: [] });
                    });

                    // Store data in state for re-rendering
                    App.state.productos = data.productos;

                    // Toggle de vista de productos
                    const viewToggleBtn = document.getElementById('view-toggle-btn');
                    if (viewToggleBtn) {
                        viewToggleBtn.addEventListener('click', () => {
                            App.state.productViewMode = App.state.productViewMode === 'compact' ? 'cards' : 'compact';
                            const container = document.getElementById('productos-container');
                            if (container) {
                                container.innerHTML = this.renderProductsList(data.productos);
                                this.attachProductListeners(); // Re-attach event listeners
                            }
                            // Update button icon
                            const icon = viewToggleBtn.querySelector('i');
                            icon.className = `fas ${App.state.productViewMode === 'compact' ? 'fa-th-large' : 'fa-list'} text-orange-600 text-sm`;
                        });
                    }
                    
                    this.attachProductListeners();
                    
                    const productForm = document.getElementById('product-form');
                    if (productForm) {
                        productForm.addEventListener('submit', async (e) => {
                            e.preventDefault();
                            
                            // NUEVA VALIDACIÓN: Verificar que se haya seleccionado una clasificación
                            const clasificacionSelect = productForm.querySelector('select[name="clasificacion"]');
                            if (!clasificacionSelect || !clasificacionSelect.value) {
                                App.ui.showToast('Por favor selecciona una clasificación para el producto', 'error');
                                clasificacionSelect?.focus();
                                return;
                            }
                            
                            const formData = new FormData(productForm);
                            
                            const categoriasSeleccionadas = Array.from(document.querySelectorAll('input[name="categoriasAsignadas"]:checked')).map(cb => cb.value);
                            
                            const submitButton = productForm.querySelector('button[type="submit"]');
                            try {
                                const response = await App.api.request(App.config.apiEndpoints.createProduct, { method: 'POST', body: formData }, submitButton);
                                const nuevoProducto = await response.json();

                                for (const categoriaId of categoriasSeleccionadas) {
                                    await App.api.request(App.config.apiEndpoints.asignarCategoria + nuevoProducto.id + '/asignar-categoria', {
                                        method: 'POST',
                                        body: JSON.stringify({ categoriaId: parseInt(categoriaId) })
                                    });
                                }
                                
                                App.ui.showToast('Producto añadido con éxito');
                                setTimeout(() => window.location.reload(), 1500);

                            } catch (error) { /* Error manejado */ }
                        });
                    }
                    
                    // Agregar listener para ocultar mensaje de error cuando se seleccione clasificación
                    const clasificacionSelect = document.getElementById('product-clasificacion');
                    if (clasificacionSelect) {
                        clasificacionSelect.addEventListener('change', function() {
                            const errorDiv = document.getElementById('clasificacion-error');
                            if (this.value && errorDiv) {
                                errorDiv.classList.add('hidden');
                            }
                        });
                    }
                },

                attachProductListeners() {
                    const productContainer = document.getElementById('productos-container');
                    if (productContainer) {
                        // Remove existing listeners to prevent duplicates
                        productContainer.removeEventListener('click', this.handleProductAction);
                        productContainer.addEventListener('click', this.handleProductAction.bind(this));
                    }
                },

                handleProductAction(e) {
                    const button = e.target.closest('button[data-action]');
                    if (!button) return;
                    
                    const productElement = button.closest('[data-product-id]');
                    const productId = productElement.dataset.productId;
                    const action = button.dataset.action;
                    
                    if (action === 'edit') {
                        this.openEditModal(productId, App.state.productos);
                    } else if (action === 'delete') {
                        this.deleteProduct(productId);
                    }
                },
                
                async openEditModal(productId, productos) {
                    const producto = productos.find(p => p.id == productId);
                    if (!producto) return;
                    
                    const modalHtml = `
                        <div id="edit-product-modal" class="fixed inset-0 z-50 flex justify-center items-center p-4 bg-black/60 backdrop-blur-sm">
                            <div class="relative w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                                <div class="bg-gradient-to-r from-orange-500 to-red-500 p-5 text-white">
                                    <div class="flex justify-between items-center">
                                        <h3 class="text-xl font-bold">✏️ Editar Producto</h3>
                                        <button onclick="this.closest('#edit-product-modal').remove()" class="text-white/80 hover:text-white text-2xl transition-colors">&times;</button>
                                    </div>
                                </div>
                                <form id="edit-product-form" class="flex flex-col flex-grow">
                                    <div class="p-6 space-y-4 overflow-y-auto">
                                        <div class="relative">
                                            <input type="text" id="edit-nombre" name="nombre" value="${producto.nombre}" class="input-field w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-orange-500 focus:outline-none transition-colors" placeholder=" " required>
                                            <label for="edit-nombre" class="floating-label">Nombre del producto</label>
                                        </div>
                                        <div class="relative">
                                            <textarea id="edit-descripcion" name="descripcion" class="textarea-field w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-orange-500 focus:outline-none transition-colors resize-none" rows="3" placeholder=" ">${producto.descripcion || ''}</textarea>
                                            <label for="edit-descripcion" class="floating-label">Descripción</label>
                                        </div>
                                        <div class="relative">
                                            <input type="number" id="edit-precio" name="precio" value="${producto.precio}" step="0.01" min="0" class="input-field w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-orange-500 focus:outline-none transition-colors" placeholder=" " required>
                                            <label for="edit-precio" class="floating-label">Precio (COP)</label>
                                        </div>
                                        <div class="relative">
                                            <select name="clasificacion" id="edit-clasificacion" class="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-orange-500 focus:outline-none transition-colors bg-white" required>
                                                <option value="">Selecciona una clasificación</option>
                                                <option value="DESAYUNO" ${producto.clasificacion === 'DESAYUNO' ? 'selected' : ''}>🥞 Desayuno</option>
                                                <option value="ALMUERZO" ${producto.clasificacion === 'ALMUERZO' ? 'selected' : ''}>🍽️ Almuerzo</option>
                                                <option value="COMIDA_RAPIDA" ${producto.clasificacion === 'COMIDA_RAPIDA' ? 'selected' : ''}>🍟 Comida Rápida</option>
                                                <option value="BEBIDAS" ${producto.clasificacion === 'BEBIDAS' ? 'selected' : ''}>🥤 Bebidas</option>
                                                <option value="POSTRES" ${producto.clasificacion === 'POSTRES' ? 'selected' : ''}>🍰 Postres</option>
                                                <option value="SNACKS" ${producto.clasificacion === 'SNACKS' ? 'selected' : ''}>🍿 Snacks</option>
                                                <option value="SALUDABLE" ${producto.clasificacion === 'SALUDABLE' ? 'selected' : ''}>🥗 Saludable</option>
                                            </select>
                                            <div class="text-red-500 text-sm mt-1 hidden" id="edit-clasificacion-error">Por favor selecciona una clasificación</div>
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-slate-700 mb-2">Imagen actual</label>
                                            <img src="${producto.imagenUrl || '/img/placeholder.svg'}" alt="Imagen actual" class="w-full h-32 object-cover rounded-2xl border border-gray-200 mb-2">
                                            <input type="file" name="imagen" class="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 transition-colors" accept="image/*">
                                        </div>
                                        <div class="flex items-center space-x-3">
                                            <input type="checkbox" id="edit-disponible" ${producto.disponible !== false ? 'checked' : ''} class="w-5 h-5 text-orange-600 rounded focus:ring-orange-500">
                                            <label for="edit-disponible" class="text-sm font-medium text-slate-700">Producto disponible</label>
                                        </div>
                                    </div>
                                    <div class="p-6 border-t bg-gray-50 flex space-x-3">
                                        <button type="button" onclick="this.closest('#edit-product-modal').remove()" class="flex-1 bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-2xl hover:bg-gray-300 transition-colors">
                                            Cancelar
                                        </button>
                                        <button type="submit" class="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 px-4 rounded-2xl hover:from-orange-600 hover:to-red-600 transition-all shadow-lg hover:shadow-xl">
                                            💾 Guardar
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>`;
                    
                    document.body.insertAdjacentHTML('beforeend', modalHtml);
                    
                    document.getElementById('edit-product-form').addEventListener('submit', async (e) => {
                        e.preventDefault();
                        
                        // NUEVA VALIDACIÓN: Verificar que se haya seleccionado una clasificación
                        const clasificacionSelect = document.getElementById('edit-clasificacion');
                        if (!clasificacionSelect || !clasificacionSelect.value) {
                            App.ui.showToast('Por favor selecciona una clasificación para el producto', 'error');
                            clasificacionSelect?.focus();
                            const errorDiv = document.getElementById('edit-clasificacion-error');
                            if (errorDiv) {
                                errorDiv.classList.remove('hidden');
                            }
                            return;
                        }
                        
                        const formData = new FormData(e.target);
                        formData.append('disponible', document.getElementById('edit-disponible').checked);
                        
                        const submitButton = e.target.querySelector('button[type="submit"]');
                        const originalContent = submitButton.innerHTML;
                        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Guardando...';
                        submitButton.disabled = true;
                        
                        try {
                            await App.api.request(`/api/vendedor/productos/${productId}/actualizar`, {
                                method: 'POST',
                                body: formData
                            });
                            
                            App.ui.showToast('✅ Producto actualizado con éxito');
                            document.getElementById('edit-product-modal').remove();
                            setTimeout(() => window.location.reload(), 1500);
                        } catch (error) {
                            submitButton.innerHTML = originalContent;
                            submitButton.disabled = false;
                        }
                    });
                    
                    // Agregar listener para ocultar mensaje de error cuando se seleccione clasificación en edición
                    const editClasificacionSelect = document.getElementById('edit-clasificacion');
                    if (editClasificacionSelect) {
                        editClasificacionSelect.addEventListener('change', function() {
                            const errorDiv = document.getElementById('edit-clasificacion-error');
                            if (this.value && errorDiv) {
                                errorDiv.classList.add('hidden');
                            }
                        });
                    }
                },
                
                async deleteProduct(productId) {
                    const confirmModalHtml = `
                        <div id="delete-confirm-modal" class="fixed inset-0 z-50 flex justify-center items-center p-4 bg-black/60 backdrop-blur-sm">
                            <div class="relative bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full transform animate-pulse">
                                <div class="text-center">
                                    <div class="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <i class="fas fa-eye-slash text-2xl text-orange-500"></i>
                                    </div>
                                    <h3 class="text-xl font-bold text-slate-800 mb-2">¿Deshabilitar producto?</h3>
                                    <p class="text-slate-500 mb-6">El producto no será visible para los clientes, pero se conservará el historial</p>
                                    <div class="flex space-x-3">
                                        <button onclick="this.closest('#delete-confirm-modal').remove()" class="flex-1 bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-2xl hover:bg-gray-300 transition-colors">
                                            Cancelar
                                        </button>
                                        <button id="confirm-delete-btn" class="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 px-4 rounded-2xl hover:from-orange-600 hover:to-red-600 transition-all shadow-lg">
                                            👁️‍�️ Deshabilitar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>`;
                    
                    document.body.insertAdjacentHTML('beforeend', confirmModalHtml);
                    
                    document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
                        const btn = document.getElementById('confirm-delete-btn');
                        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Deshabilitando...';
                        btn.disabled = true;
                        
                        try {
                            await App.api.request(`/api/vendedor/productos/${productId}/eliminar`, {
                                method: 'DELETE'
                            });
                            
                            App.ui.showToast('�️‍🗨️ Producto deshabilitado con éxito');
                            document.getElementById('delete-confirm-modal').remove();
                            setTimeout(() => window.location.reload(), 1500);
                        } catch (error) {
                            btn.innerHTML = '👁️‍�️ Deshabilitar';
                            btn.disabled = false;
                        }
                    });
                }
            },

            Perfil: {
                render(data) {
                    return `<div id="view-perfil" class="main-view p-4"><header class="mb-4"><h1 class="text-2xl font-bold text-slate-800">Mi Tienda</h1></header><div class="space-y-4"><div class="bg-white rounded-xl shadow-md"><nav class="flex flex-col"><a href="#" data-modal-open="edit-store-modal" class="flex items-center gap-4 p-4 border-b hover:bg-slate-50"><i class="fas fa-store w-6 text-center text-indigo-500"></i><div><p class="font-semibold">Perfil de la Tienda</p><p class="text-sm text-slate-500">Edita nombre, logo y descripción</p></div><i class="fas fa-chevron-right text-slate-400 ml-auto"></i></a><a href="#" data-modal-open="schedule-modal" class="flex items-center gap-4 p-4 border-b hover:bg-slate-50"><i class="fas fa-clock w-6 text-center text-blue-500"></i><div><p class="font-semibold">Horarios de Atención</p><p class="text-sm text-slate-500">Define cuándo recibes pedidos</p></div><i class="fas fa-chevron-right text-slate-400 ml-auto"></i></a>
                    
                    <a href="#" data-modal-open="options-modal" class="flex items-center gap-4 p-4 border-b hover:bg-slate-50"><i class="fas fa-plus-square w-6 text-center text-purple-500"></i><div><p class="font-semibold">Gestionar Opciones</p><p class="text-sm text-slate-500">Crea salsas, adiciones, etc.</p></div><i class="fas fa-chevron-right text-slate-400 ml-auto"></i></a>

                    <a href="#" class="flex items-center gap-4 p-4 border-b hover:bg-slate-50"><i class="fas fa-tags w-6 text-center text-amber-500"></i><div><p class="font-semibold">Promociones</p><p class="text-sm text-slate-500">Crea ofertas y paquetes</p></div><i class="fas fa-chevron-right text-slate-400 ml-auto"></i></a></nav></div><form id="logout-form" action="/logout" method="post"><input type="hidden" name="_csrf" value="${App.config.csrfToken}" /><button type="submit" class="w-full bg-white hover:bg-red-50 text-red-600 font-semibold py-3 px-4 rounded-xl shadow-md flex items-center justify-center gap-3"><i class="fas fa-sign-out-alt"></i>Cerrar Sesión</button></form></div></div>`;
                },
                init(data) {
                      App.ui.initModal('edit-store-modal', () => {
                          document.getElementById('edit-nombre-tienda').value = data.tienda.nombre;
                          document.getElementById('edit-descripcion-tienda').value = data.tienda.descripcion;
                          document.getElementById('edit-logo-preview').src = data.tienda.logoUrl || '/img/logo-placeholder.svg';
                      });
                      const editForm = document.getElementById('edit-store-form');
                      if (editForm) {
                          editForm.addEventListener('submit', async (e) => {
                              e.preventDefault();
                              const formData = new FormData(editForm);
                              const submitButton = editForm.querySelector('button[type="submit"]');
                              try {
                                  await App.api.request(App.config.apiEndpoints.updateStore, { method: 'POST', body: formData }, submitButton);
                                  App.ui.showToast('¡Perfil actualizado con éxito!');
                                  setTimeout(() => window.location.reload(), 1500);
                              } catch (error) { /* Error manejado */ }
                          });
                      }
                      App.ui.initModal('schedule-modal', () => {
                          this.ScheduleManager.init(data.horarios);
                      });

                      // --- LÓGICA AÑADIDA PARA EL NUEVO MODAL ---
                      App.ui.initModal('options-modal', () => {
                          // Cuando se abra el modal, inicializamos el nuevo componente de Opciones
                          App.components.Opciones.init();
                      });
                      
                      // Limpiar sesión al hacer logout
                      const logoutForm = document.getElementById('logout-form');
                      if (logoutForm) {
                          logoutForm.addEventListener('submit', () => {
                              // Limpiar datos de sesión antes del logout
                              sessionStorage.removeItem('vendedor-session-active');
                              localStorage.removeItem('vendedor-current-view');
                              window.Logger.info('Session', 'Limpiando datos de sesión antes del logout');
                          });
                      }
                },
                ScheduleManager: {
                    init(horarios) {
                        const container = document.getElementById('schedule-days-container');
                        const form = document.getElementById('schedule-form');
                        if (!container || !form) return;
                        const dias = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];
                        container.innerHTML = dias.map(dia => {
                            const horarioExistente = horarios.find(h => h.dia === dia);
                            const estaAbierto = horarioExistente?.abierto || false;
                            const apertura = horarioExistente?.horaApertura?.substring(0, 5) || '08:00';
                            const cierre = horarioExistente?.horaCierre?.substring(0, 5) || '17:00';
                            return `<div class="grid grid-cols-3 items-center gap-3 border-b pb-3" data-day="${dia}"><div class="flex items-center gap-2"><input type="checkbox" id="check-${dia}" class="day-toggle h-5 w-5 rounded" ${estaAbierto ? 'checked' : ''}><label for="check-${dia}" class="font-semibold capitalize">${dia.toLowerCase()}</label></div><input type="time" class="time-input border rounded px-2 py-1" value="${apertura}" ${!estaAbierto ? 'disabled' : ''}><input type="time" class="time-input border rounded px-2 py-1" value="${cierre}" ${!estaAbierto ? 'disabled' : ''}></div>`;
                        }).join('');
                        container.querySelectorAll('.day-toggle').forEach(checkbox => {
                            checkbox.addEventListener('change', (e) => {
                                e.target.closest('[data-day]').querySelectorAll('.time-input').forEach(input => input.disabled = !e.target.checked);
                            });
                        });
                        form.onsubmit = async (e) => {
                            e.preventDefault();
                            const submitButton = form.querySelector('button[type="submit"]');
                            const horariosPayload = Array.from(container.querySelectorAll('[data-day]')).map(row => ({ dia: row.dataset.day, abierto: row.querySelector('.day-toggle').checked, horaApertura: row.querySelectorAll('.time-input')[0].value, horaCierre: row.querySelectorAll('.time-input')[1].value }));
                            try {
                                await App.api.request(App.config.apiEndpoints.updateSchedules, {
                                    method: 'POST',
                                    body: JSON.stringify(horariosPayload)
                                }, submitButton);
                                App.ui.showToast('¡Horarios actualizados!');
                                setTimeout(() => {
                                    document.getElementById('schedule-modal')?.classList.add('hidden');
                                    window.location.reload();
                                }, 1500);
                            } catch (error) { /* Error manejado */ }
                        };
                    }
                }
            },

            Opciones: {
                init() {
                    const container = document.getElementById('options-list-container');
                    if(!container) return;
                    container.innerHTML = `<div class="text-center p-4"><i class="fas fa-spinner fa-spin"></i></div>`;

                    fetch(App.config.apiEndpoints.getCategorias)
                        .then(res => {
                            if (!res.ok) throw new Error('Error al cargar categorías');
                            return res.json();
                        })
                        .then(categorias => {
                            App.state.categorias = categorias;
                            this.render(categorias);
                        })
                        .catch(err => {
                            container.innerHTML = `<p class="text-red-500">${err.message}</p>`;
                        });

                    const form = document.getElementById('crear-categoria-form');
                    form.removeEventListener('submit', this.handleFormSubmit);
                    form.addEventListener('submit', this.handleFormSubmit);

                    const addOptionBtn = document.getElementById('add-option-btn');
                    addOptionBtn.removeEventListener('click', this.addOptionField);
                    addOptionBtn.addEventListener('click', this.addOptionField);
                },

                render(categorias) {
                    const container = document.getElementById('options-list-container');
                    if (categorias.length === 0) {
                        container.innerHTML = `<p class="text-slate-500 text-sm p-4 text-center">Aún no has creado categorías de opciones.</p>`;
                        return;
                    }
                    container.innerHTML = categorias.map(cat => `
                        <div class="border rounded-lg p-3 mb-2">
                            <p class="font-bold">${cat.nombre}</p>
                            <div class="text-xs text-slate-600">
                                ${cat.opciones.map(op => `<span>${op.nombre} (${(op.precioAdicional || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })})</span>`).join(', ')}
                            </div>
                        </div>
                    `).join('');
                },
                
                addOptionField() {
                    const container = document.getElementById('new-options-container');
                    const newField = document.createElement('div');
                    newField.className = 'flex gap-2 items-center mb-2';
                    newField.innerHTML = `
                        <input type="text" placeholder="Nombre Opción" class="input-field block w-full px-2 py-2 border border-slate-300 rounded-md option-name" required>
                        <input type="number" placeholder="Precio" value="0" step="100" class="input-field block w-32 px-2 py-2 border border-slate-300 rounded-md option-price" required>
                        <button type="button" class="text-red-500 text-2xl font-bold remove-option-btn">&times;</button>
                    `;
                    container.appendChild(newField);
                    newField.querySelector('.remove-option-btn').addEventListener('click', () => newField.remove());
                },

                async handleFormSubmit(e) {
                    e.preventDefault();
                    const form = e.target;
                    const submitButton = form.querySelector('button[type="submit"]');
                    const nombreCategoria = form.querySelector('input[name="nombreCategoria"]').value;
                    
                    const opciones = [];
                    form.querySelectorAll('#new-options-container > div').forEach(field => {
                        opciones.push({
                            nombre: field.querySelector('.option-name').value,
                            precioAdicional: parseFloat(field.querySelector('.option-price').value)
                        });
                    });

                    const dto = { nombre: nombreCategoria, opciones: opciones };

                    try {
                        await App.api.request(App.config.apiEndpoints.crearCategoria, {
                            method: 'POST',
                            body: JSON.stringify(dto)
                        }, submitButton);
                        
                        App.ui.showToast('Categoría creada con éxito');
                        form.reset();
                        document.getElementById('new-options-container').innerHTML = '';
                        App.components.Opciones.init(); // Recargamos la lista
                    } catch (error) { /* Manejado en App.api */ }
                },
                
                renderAsignacion(categorias, producto) {
                    const container = document.getElementById('product-options-assignment');
                    if (!container) return;
                    
                    if(categorias.length === 0) {
                         container.innerHTML = `<p class="text-xs text-slate-400">No hay opciones creadas. Ve a Mi Tienda > Gestionar Opciones.</p>`;
                         return;
                    }
                    
                    const idsCategoriasAsignadas = (producto && producto.categoriasDeOpciones) ? producto.categoriasDeOpciones.map(c => c.id) : [];

                    container.innerHTML = `<p class="font-semibold mb-2">Asignar Opciones a este Producto:</p>` + categorias.map(cat => `
                        <label class="flex items-center gap-2">
                            <input type="checkbox" name="categoriasAsignadas" value="${cat.id}" ${idsCategoriasAsignadas.includes(cat.id) ? 'checked' : ''}>
                            <span>${cat.nombre}</span>
                        </label>
                    `).join('');
                }
            },

        },

        // Function to remove all loading indicators
        removeAllLoadingIndicators() {
            // Remove sync indicators
            const syncIndicator = document.getElementById('sync-indicator');
            if (syncIndicator) syncIndicator.remove();
            
            // Remove any spinners that might be stuck
            const spinners = document.querySelectorAll('.fa-spinner');
            spinners.forEach(spinner => {
                const container = spinner.closest('.flex, .bg-white, div');
                if (container && container.textContent.includes('Cargando')) {
                    container.remove();
                }
            });
            
            // Remove main loading container if still present
            const loadingContainers = document.querySelectorAll('div[class*="h-screen"]');
            loadingContainers.forEach(container => {
                if (container.textContent.includes('Cargando Dashboard') || 
                    container.textContent.includes('Preparando tu panel')) {
                    container.remove();
                }
            });
            
            console.log('🧹 All loading indicators cleaned up');
        },

        async init() {
            if (!this.config.container) {
                console.error('Error crítico: El contenedor del dashboard no fue encontrado.');
                document.body.innerHTML = '<p class="text-red-500 text-center mt-10">Error de configuración: #vendor-dashboard-container no existe.</p>';
                return;
            }
            
            // Show immediate loading indicator
            this.config.container.innerHTML = `
                <div class="flex flex-col justify-center items-center h-screen bg-slate-50">
                    <div class="bg-white p-8 rounded-2xl shadow-lg text-center">
                        <i class="fas fa-spinner fa-spin text-4xl text-indigo-500 mb-4"></i>
                        <h2 class="text-xl font-bold text-slate-800 mb-2">Cargando Dashboard</h2>
                        <p class="text-slate-600">Preparando tu panel de control...</p>
                    </div>
                </div>
            `;

            // Add timeout to prevent hanging
            const loadTimeout = setTimeout(() => {
                console.warn('⚠️ Dashboard load timeout - forcing UI render');
                this.ui.render(`
                    <div class="p-8 text-center text-yellow-600 bg-slate-50 min-h-screen flex items-center justify-center">
                        <div class="bg-white p-8 rounded-2xl shadow-lg max-w-md">
                            <i class="fas fa-exclamation-triangle text-4xl text-yellow-500 mb-4"></i>
                            <h2 class="text-xl font-bold mb-2">Carga lenta</h2>
                            <p class="text-slate-600 mb-4">El dashboard está tardando más de lo esperado</p>
                            <button onclick="window.location.reload()" class="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">
                                <i class="fas fa-redo mr-2"></i>Reintentar
                            </button>
                        </div>
                    </div>
                `);
            }, 15000); // 15 seconds timeout

            try {
                console.time('Dashboard Load Time');
                const response = await fetch(this.config.apiEndpoints.getDashboard);
                
                // Clear timeout since load is progressing
                clearTimeout(loadTimeout);
                
                if (response.status === 404) {
                    console.log('🏪 No store found, showing welcome screen');
                    this.ui.render(this.components.Welcome.render());
                    this.components.Welcome.init();
                } else if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Dashboard data loaded:', data);
                    
                    // Update state immediately
                    this.state = { ...this.state, ...data };
                    
                    // Render UI immediately - this removes the loading indicator
                    this.ui.render(this.components.Dashboard.render(this.state.tienda));
                    
                    // Initialize dashboard components (now non-blocking)
                    this.components.Dashboard.init(this.state);
                    
                    console.timeEnd('Dashboard Load Time');
                    console.log('🚀 Dashboard rendered successfully - UI should be ready now');
                    
                    // Force remove any remaining loading indicators
                    this.removeAllLoadingIndicators();
                } else {
                    throw new Error(`Error del servidor: ${await response.text()}`);
                }
            } catch (error) {
                // Clear timeout in case of error
                clearTimeout(loadTimeout);
                
                console.error('❌ Dashboard load error:', error);
                this.ui.render(`
                    <div class="p-8 text-center text-red-600 bg-slate-50 min-h-screen flex items-center justify-center">
                        <div class="bg-white p-8 rounded-2xl shadow-lg max-w-md">
                            <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
                            <h2 class="text-xl font-bold mb-2">Error al cargar</h2>
                            <p class="text-slate-600 mb-4">${error.message}</p>
                            <button onclick="window.location.reload()" class="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">
                                <i class="fas fa-redo mr-2"></i>Reintentar
                            </button>
                        </div>
                    </div>
                `);
            }
        }
    };

    App.init();

    // Track user activity for intelligent polling
    const trackUserActivity = () => {
        App.state.lastUserInteraction = Date.now();
        if (!App.state.isUserActive) {
            App.state.isUserActive = true;
            console.log('👤 Usuario activo detectado - acelerando polling');
            // If polling is active and user became active again, restart with FAST polling
            if (App.state.isPollingActive && App.state.currentView === 'pedidos') {
                // Reset to fast polling when user becomes active
                App.state.consecutiveNoChanges = 0;
                App.components.Pedidos.adjustPollingSpeed(false);
            }
        }
    };

    // Listen for user activity events
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
        document.addEventListener(event, trackUserActivity, { passive: true });
    });

    // Cleanup when page is unloaded
    window.addEventListener('beforeunload', () => {
        App.components.Pedidos.stopPolling();
        App.components.Dashboard.cleanup();
    });

    // Stop polling when page becomes hidden (browser tab switch, minimize, etc.)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('👁️ Página oculta - pausando polling');
            App.components.Pedidos.stopPolling();
        } else if (App.state.currentView === 'pedidos') {
            // Resume polling when page becomes visible again and we're on pedidos view
            Logger.debug('VendorApp', 'Página visible - reanudando polling');
            trackUserActivity(); // Mark as active
            App.components.Pedidos.startPolling();
        }
    });
    
    // FUNCIÓN GLOBAL PARA EL BOTÓN DE TIENDA (Versión compacta)
    window.toggleTiendaStatus = async function() {
        console.log('🏪 FUNCIÓN GLOBAL EJECUTADA - toggleTiendaStatus()');
        
        const button = document.getElementById('btn-toggle-tienda');
        if (!button) {
            console.error('❌ No se encontró el botón btn-toggle-tienda');
            return;
        }
        
        const currentState = button.dataset.estado === 'true';
        const newState = !currentState;
        
        console.log('🏪 Cambio de estado:', currentState, '->', newState);
        
        // Loading compacto
        const originalContent = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        button.disabled = true;
        
        try {
            const response = await fetch('/api/vendedor/tienda/estado', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estaAbierta: newState })
            });
            
            if (response.ok) {
                console.log('✅ Estado cambiado exitosamente');
                
                // Actualizar botón compacto
                button.dataset.estado = newState.toString();
                button.className = `px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 shadow-md ${newState ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`;
                button.innerHTML = `<i class="fas ${newState ? 'fa-times' : 'fa-check'} mr-1"></i>${newState ? 'Cerrar' : 'Abrir'}`;
                
                // Actualizar indicador pequeño
                const indicator = document.querySelector('.w-2.h-2.rounded-full');
                if (indicator) {
                    indicator.className = `w-2 h-2 rounded-full ${newState ? 'bg-green-500' : 'bg-red-500'} animate-pulse`;
                }
                
                // Actualizar texto de estado
                const estadoSpan = indicator?.nextElementSibling;
                if (estadoSpan) {
                    estadoSpan.className = `text-xs font-medium ${newState ? 'text-green-600' : 'text-red-600'}`;
                    estadoSpan.textContent = newState ? 'ABIERTA' : 'CERRADA';
                }
                
                // Toast compacto
                App.ui.showToast(
                    newState ? 'Tienda abierta' : 'Tienda cerrada', 
                    'success'
                );
                
            } else {
                throw new Error('Error del servidor');
            }
        } catch (error) {
            console.error('❌ Error:', error);
            button.innerHTML = originalContent;
            App.ui.showToast('Error al cambiar estado', 'error');
        } finally {
            button.disabled = false;
        }
    };

    // 🔥 NUEVO COMPONENTE: PROMOCIONES / PRODUCTOS POTENCIADOS
    App.components.Promociones = {
        render(data) {
            return `
                <div id="promociones-view" class="view hidden">
                    <div class="p-4 space-y-4">
                        <!-- Header -->
                        <div class="bg-gradient-to-r from-red-500 via-pink-500 to-purple-600 rounded-2xl p-4 text-white">
                            <div class="flex items-center justify-between">
                                <div>
                                    <h1 class="text-lg font-bold flex items-center gap-2">
                                        🔥 Promociones
                                        <span class="bg-white/20 px-2 py-0.5 rounded-full text-xs">Marketing Pro</span>
                                    </h1>
                                    <p class="text-white/90 text-sm mt-1">Potencia tus productos y aumenta las ventas</p>
                                </div>
                                <div class="text-right">
                                    <div class="bg-white/20 rounded-lg px-3 py-2">
                                        <p class="text-xs font-medium">Disponible</p>
                                        <p class="text-sm font-bold">$5,000</p>
                                        <p class="text-xs opacity-90">por 4h</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Productos Actualmente Potenciados -->
                        <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                            <div class="flex items-center justify-between mb-3">
                                <h2 class="font-bold text-gray-900 flex items-center gap-2">
                                    <i class="fas fa-fire text-orange-500"></i>
                                    Promociones Activas
                                </h2>
                                <span id="promociones-activas-count" class="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">0</span>
                            </div>
                            <div id="promociones-activas-container" class="space-y-3">
                                <!-- Se cargan dinámicamente -->
                            </div>
                        </div>

                        <!-- Seleccionar Productos para Potenciar -->
                        <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                            <div class="flex items-center justify-between mb-3">
                                <h2 class="font-bold text-gray-900 flex items-center gap-2">
                                    <i class="fas fa-rocket text-indigo-500"></i>
                                    Potenciar Productos
                                </h2>
                                <span class="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs font-medium">Máx. 5</span>
                            </div>
                            
                            <!-- Filtro de búsqueda -->
                            <div class="mb-4">
                                <div class="relative">
                                    <input type="text" id="buscar-productos-promocion" 
                                           placeholder="Buscar productos para promocionar..." 
                                           class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center">
                                        <i class="fas fa-search text-gray-400"></i>
                                    </div>
                                </div>
                            </div>

                            <!-- Lista de productos disponibles -->
                            <div id="productos-disponibles-container" class="space-y-2 max-h-60 overflow-y-auto">
                                <!-- Se cargan dinámicamente -->
                            </div>

                            <!-- Productos seleccionados para promoción -->
                            <div id="productos-seleccionados-section" class="hidden mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                                <h3 class="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                    <i class="fas fa-check-circle text-green-500"></i>
                                    Productos Seleccionados (<span id="productos-seleccionados-count">0</span>/5)
                                </h3>
                                <div id="productos-seleccionados-container" class="space-y-2 mb-4">
                                    <!-- Productos seleccionados -->
                                </div>
                                
                            <!-- Configuración de promoción -->
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Tipo de Promoción</label>
                                <select id="tipo-promocion-select" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                                    <option value="SUPER_PROMO">🔥 Super Promo</option>
                                    <option value="MAS_VENDIDO">⭐ Más Vendido</option>
                                    <option value="OFERTA_ESPECIAL">💎 Oferta Especial</option>
                                    <option value="DESCUENTO_FLASH">⚡ Descuento Flash</option>
                                    <option value="PRODUCTO_DESTACADO">🏆 Producto Destacado</option>
                                </select>
                            </div>
                            
                            <!-- Información sobre el marketing -->
                            <div class="bg-blue-50 rounded-lg p-3 mb-4">
                                <p class="text-sm text-blue-800 flex items-center gap-2">
                                    <i class="fas fa-info-circle"></i>
                                    Los productos mantendrán su precio original pero tendrán mayor visibilidad
                                </p>
                            </div>                                <!-- Resumen de costos -->
                                <div class="bg-white rounded-lg p-3 border border-gray-200 mb-4">
                                    <div class="flex justify-between items-center text-sm">
                                        <span class="text-gray-600">Productos seleccionados:</span>
                                        <span id="resumen-productos">0</span>
                                    </div>
                                    <div class="flex justify-between items-center text-sm">
                                        <span class="text-gray-600">Costo por producto:</span>
                                        <span>$5,000</span>
                                    </div>
                                    <div class="flex justify-between items-center text-sm">
                                        <span class="text-gray-600">Duración:</span>
                                        <span>4 horas</span>
                                    </div>
                                    <hr class="my-2">
                                    <div class="flex justify-between items-center font-bold">
                                        <span>Total:</span>
                                        <span id="costo-total" class="text-indigo-600">$0</span>
                                    </div>
                                </div>

                                <!-- Botón de confirmación -->
                                <button id="confirmar-promocion-btn" 
                                        class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2">
                                    <i class="fas fa-rocket"></i>
                                    Potenciar Productos
                                </button>
                            </div>
                        </div>

                        <!-- Información sobre promociones -->
                        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                            <h3 class="font-bold text-blue-900 mb-2 flex items-center gap-2">
                                <i class="fas fa-info-circle"></i>
                                ¿Cómo funcionan las promociones?
                            </h3>
                            <ul class="text-sm text-blue-800 space-y-1">
                                <li class="flex items-start gap-2">
                                    <i class="fas fa-check text-green-500 mt-0.5 text-xs"></i>
                                    <span>Tus productos aparecen en un banner especial en la página principal</span>
                                </li>
                                <li class="flex items-start gap-2">
                                    <i class="fas fa-check text-green-500 mt-0.5 text-xs"></i>
                                    <span>Duración de 4 horas desde el momento de activación</span>
                                </li>
                                <li class="flex items-start gap-2">
                                    <i class="fas fa-check text-green-500 mt-0.5 text-xs"></i>
                                    <span>Máximo 5 productos promocionados simultáneamente</span>
                                </li>
                                <li class="flex items-start gap-2">
                                    <i class="fas fa-check text-green-500 mt-0.5 text-xs"></i>
                                    <span>Badges especiales y precios destacados</span>
                                </li>
                                <li class="flex items-start gap-2">
                                    <i class="fas fa-check text-green-500 mt-0.5 text-xs"></i>
                                    <span>Mayor visibilidad = más ventas potenciales</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            `;
        },

        init(data) {
            this.productos = data.productos || [];
            this.productosSeleccionados = [];
            this.promocionesActivas = [];
            
            // Cargar promociones activas
            this.cargarPromocionesActivas();
            
            // Renderizar productos disponibles
            this.renderProductosDisponibles();
            
            // Event listeners
            this.initEventListeners();
        },

        async cargarPromocionesActivas() {
            try {
                const response = await fetch('/api/productos-potenciados/tienda/mis-promociones', {
                    headers: {
                        [App.config.csrfHeader]: App.config.csrfToken
                    }
                });
                
                if (response.ok) {
                    this.promocionesActivas = await response.json();
                    this.renderPromocionesActivas();
                }
            } catch (error) {
                console.error('❌ Error al cargar promociones activas:', error);
            }
        },

        renderPromocionesActivas() {
            const container = document.getElementById('promociones-activas-container');
            const count = document.getElementById('promociones-activas-count');
            
            if (!container || !count) return;

            count.textContent = this.promocionesActivas.length;

            if (this.promocionesActivas.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-6 text-gray-500">
                        <i class="fas fa-fire-extinguisher text-3xl mb-2 opacity-50"></i>
                        <p class="text-sm">No tienes promociones activas</p>
                        <p class="text-xs text-gray-400 mt-1">¡Potencia tus productos para aumentar las ventas!</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = this.promocionesActivas.map(promocion => `
                <div class="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-3 border border-orange-200">
                    <div class="flex items-center justify-between">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="bg-gradient-to-r ${this.getPromocionGradient(promocion.tipoPromocion)} text-white px-2 py-0.5 rounded text-xs font-bold">
                                    ${promocion.etiquetaPromocion}
                                </span>
                                <span class="text-xs text-gray-500">${promocion.horasRestantes}h restantes</span>
                            </div>
                            <h4 class="font-medium text-gray-900 text-sm">${promocion.nombreProducto}</h4>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="text-gray-500 line-through text-xs">$${this.formatPrice(promocion.precioMostrado)}</span>
                                <span class="text-emerald-600 font-bold text-sm">$${this.formatPrice(promocion.precioPromocional)}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="text-xs text-gray-400">
                                <i class="fas fa-fire text-orange-500"></i>
                                Activa
                            </div>
                            <button onclick="App.components.Promociones.cancelarPromocion(${promocion.id})" 
                                    class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200 transition-colors flex items-center gap-1"
                                    title="Quitar oferta">
                                <i class="fas fa-fire-extinguisher text-xs"></i>
                                Quitar
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        },

        renderProductosDisponibles() {
            const container = document.getElementById('productos-disponibles-container');
            if (!container) return;

            // Filtrar productos que no estén ya promocionados
            const productosDisponibles = this.productos.filter(producto => 
                !this.promocionesActivas.some(promo => promo.productoId === producto.id)
            );

            if (productosDisponibles.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-6 text-gray-500">
                        <i class="fas fa-box-open text-3xl mb-2 opacity-50"></i>
                        <p class="text-sm">No hay productos disponibles para promocionar</p>
                        <p class="text-xs text-gray-400 mt-1">Todos tus productos están promocionados o no tienes productos</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = productosDisponibles.map(producto => `
                <div class="producto-disponible border border-gray-200 rounded-lg p-3 hover:border-indigo-300 hover:bg-indigo-50 transition-all cursor-pointer"
                     data-producto-id="${producto.id}">
                    <div class="flex items-center gap-3">
                        <img src="${producto.imagenUrl || '/uploads/productos/default.jpg'}" 
                             alt="${producto.nombre}"
                             class="w-12 h-12 object-cover rounded-lg">
                        <div class="flex-1">
                            <h4 class="font-medium text-gray-900 text-sm">${producto.nombre}</h4>
                            <p class="text-gray-500 text-xs">${producto.descripcion?.substring(0, 50) || 'Sin descripción'}...</p>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="text-emerald-600 font-bold text-sm">$${this.formatPrice(producto.precio)}</span>
                                <span class="text-xs text-gray-400">• ${producto.clasificacion}</span>
                            </div>
                        </div>
                        <div class="flex items-center">
                            <div class="w-5 h-5 border-2 border-gray-300 rounded producto-checkbox" data-producto-id="${producto.id}">
                                <i class="fas fa-check text-white text-xs hidden"></i>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        },

        initEventListeners() {
            // Buscar productos
            const searchInput = document.getElementById('buscar-productos-promocion');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.filtrarProductos(e.target.value);
                });
            }

            // Seleccionar productos
            document.addEventListener('click', (e) => {
                if (e.target.closest('.producto-disponible')) {
                    const productoDiv = e.target.closest('.producto-disponible');
                    const productoId = parseInt(productoDiv.dataset.productoId);
                    this.toggleProductoSeleccion(productoId);
                }
            });

            // Confirmar promoción
            const confirmarBtn = document.getElementById('confirmar-promocion-btn');
            if (confirmarBtn) {
                confirmarBtn.addEventListener('click', () => this.confirmarPromocion());
            }

            // Actualizar resumen cuando cambie el tipo
            const tipoSelect = document.getElementById('tipo-promocion-select');
            if (tipoSelect) {
                tipoSelect.addEventListener('change', () => this.actualizarResumen());
            }
        },

        filtrarProductos(busqueda) {
            const productos = document.querySelectorAll('.producto-disponible');
            const termino = busqueda.toLowerCase();

            productos.forEach(producto => {
                const nombre = producto.querySelector('h4').textContent.toLowerCase();
                const descripcion = producto.querySelector('p').textContent.toLowerCase();
                
                if (nombre.includes(termino) || descripcion.includes(termino)) {
                    producto.style.display = 'block';
                } else {
                    producto.style.display = 'none';
                }
            });
        },

        toggleProductoSeleccion(productoId) {
            const index = this.productosSeleccionados.indexOf(productoId);
            
            if (index === -1) {
                // Agregar si no está seleccionado y hay espacio
                if (this.productosSeleccionados.length < 5) {
                    this.productosSeleccionados.push(productoId);
                } else {
                    App.ui.showToast('Máximo 5 productos por promoción', 'warning');
                    return;
                }
            } else {
                // Remover si ya está seleccionado
                this.productosSeleccionados.splice(index, 1);
            }

            this.actualizarVisualizacionSeleccion();
            this.renderProductosSeleccionados();
            this.actualizarResumen();
        },

        actualizarVisualizacionSeleccion() {
            // Actualizar checkboxes
            document.querySelectorAll('.producto-checkbox').forEach(checkbox => {
                const productoId = parseInt(checkbox.dataset.productoId);
                const isSelected = this.productosSeleccionados.includes(productoId);
                
                if (isSelected) {
                    checkbox.classList.remove('border-gray-300');
                    checkbox.classList.add('bg-indigo-600', 'border-indigo-600');
                    checkbox.querySelector('i').classList.remove('hidden');
                } else {
                    checkbox.classList.add('border-gray-300');
                    checkbox.classList.remove('bg-indigo-600', 'border-indigo-600');
                    checkbox.querySelector('i').classList.add('hidden');
                }
            });

            // Mostrar/ocultar sección de seleccionados
            const section = document.getElementById('productos-seleccionados-section');
            if (section) {
                if (this.productosSeleccionados.length > 0) {
                    section.classList.remove('hidden');
                } else {
                    section.classList.add('hidden');
                }
            }
        },

        renderProductosSeleccionados() {
            const container = document.getElementById('productos-seleccionados-container');
            const count = document.getElementById('productos-seleccionados-count');
            
            if (!container || !count) return;

            count.textContent = this.productosSeleccionados.length;

            const productosSeleccionados = this.productos.filter(p => 
                this.productosSeleccionados.includes(p.id)
            );

            container.innerHTML = productosSeleccionados.map(producto => `
                <div class="flex items-center gap-3 bg-white rounded-lg p-2 border border-indigo-200">
                    <img src="${producto.imagenUrl || '/uploads/productos/default.jpg'}" 
                         alt="${producto.nombre}"
                         class="w-10 h-10 object-cover rounded-lg">
                    <div class="flex-1">
                        <h5 class="font-medium text-gray-900 text-sm">${producto.nombre}</h5>
                        <span class="text-emerald-600 font-bold text-xs">$${this.formatPrice(producto.precio)}</span>
                    </div>
                    <button onclick="App.components.Promociones.toggleProductoSeleccion(${producto.id})"
                            class="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors">
                        <i class="fas fa-times text-xs"></i>
                    </button>
                </div>
            `).join('');
        },

        actualizarResumen() {
            const count = this.productosSeleccionados.length;
            const costoTotal = count * 5000;

            const resumenProductos = document.getElementById('resumen-productos');
            const costoTotalEl = document.getElementById('costo-total');

            if (resumenProductos) resumenProductos.textContent = count;
            if (costoTotalEl) costoTotalEl.textContent = `$${this.formatPrice(costoTotal)}`;
        },

        async confirmarPromocion() {
            if (this.productosSeleccionados.length === 0) {
                App.ui.showToast('Selecciona al menos un producto', 'warning');
                return;
            }

            const tipoPromocion = document.getElementById('tipo-promocion-select')?.value;

            if (!tipoPromocion) {
                App.ui.showToast('Selecciona un tipo de promoción', 'warning');
                return;
            }

            const confirmarBtn = document.getElementById('confirmar-promocion-btn');
            const originalContent = confirmarBtn.innerHTML;
            
            try {
                confirmarBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Procesando...';
                confirmarBtn.disabled = true;

                const response = await fetch('/api/productos-potenciados/potenciar', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        [App.config.csrfHeader]: App.config.csrfToken
                    },
                    body: JSON.stringify({
                        productosIds: this.productosSeleccionados,
                        tipoPromocion: tipoPromocion
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    App.ui.showToast(result.mensaje || 'Productos promocionados exitosamente!', 'success');
                    
                    // Limpiar selección
                    this.productosSeleccionados = [];
                    this.actualizarVisualizacionSeleccion();
                    
                    // Recargar promociones activas
                    await this.cargarPromocionesActivas();
                    this.renderProductosDisponibles();
                    
                    // Limpiar formulario
                    document.getElementById('tipo-promocion-select').value = 'SUPER_PROMO';
                    
                } else {
                    const error = await response.text();
                    throw new Error(error);
                }

            } catch (error) {
                console.error('❌ Error al confirmar promoción:', error);
                App.ui.showToast('Error al procesar la promoción', 'error');
            } finally {
                confirmarBtn.innerHTML = originalContent;
                confirmarBtn.disabled = false;
            }
        },

        async cancelarPromocion(promocionId) {
            // Buscar la promoción para obtener el productoId
            const promocion = this.promocionesActivas.find(p => p.id === promocionId);
            if (!promocion) {
                App.ui.showToast('Promoción no encontrada', 'error');
                return;
            }

            // Mostrar confirmación simple y directa
            const mensaje = `¿Deseas cancelar la promoción de "${promocion.nombreProducto}"?`;
            if (!confirm(mensaje)) {
                return;
            }

            try {
                // Usar el endpoint correcto con query parameter
                const url = new URL(App.config.apiEndpoints.cancelarPotenciacion, window.location.origin);
                url.searchParams.append('productosIds', promocion.productoId);
                
                const response = await fetch(url, {
                    method: 'DELETE',
                    headers: {
                        [App.config.csrfHeader]: App.config.csrfToken
                    }
                });

                if (response.ok) {
                    const result = await response.json();
                    
                    // Mostrar toast elegante de agradecimiento
                    App.ui.showToast(
                        `🎉 Promoción de "${promocion.nombreProducto}" cancelada. ¡Gracias por usar nuestros servicios!`, 
                        'success'
                    );
                    
                    await this.cargarPromocionesActivas();
                    this.renderProductosDisponibles();
                } else {
                    const error = await response.json();
                    throw new Error(error.error || 'Error al cancelar promoción');
                }

            } catch (error) {
                console.error('❌ Error al cancelar promoción:', error);
                App.ui.showToast(`❌ Error: ${error.message}`, 'error');
            }
        },

        getPromocionGradient(tipoPromocion) {
            const gradientes = {
                'SUPER_PROMO': 'from-red-500 to-pink-600',
                'MAS_VENDIDO': 'from-yellow-500 to-orange-600',
                'OFERTA_ESPECIAL': 'from-purple-500 to-pink-600',
                'DESCUENTO_FLASH': 'from-indigo-500 to-purple-600',
                'PRODUCTO_DESTACADO': 'from-emerald-500 to-teal-600'
            };
            return gradientes[tipoPromocion] || 'from-gray-500 to-gray-600';
        },

        formatPrice(price) {
            return new Intl.NumberFormat('es-CO').format(price);
        }
    };
    
} // End of startVendorApp function