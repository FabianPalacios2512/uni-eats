/**
 * UniEats - Efectos Modernos y Micro-interacciones 2024
 * Sistema de efectos visuales avanzados para una experiencia premium
 */

class ModernEffects {
    constructor() {
        this.init();
    }

    init() {
        this.setupParallaxEffects();
        this.setupSmoothScrolling();
        this.setupIntersectionObserver();
        this.setupTouchFeedback();
        this.setupLoadingAnimations();
        this.setupHoverEffects();
    }

    /**
     * Efectos de parallax suaves para el header
     */
    setupParallaxEffects() {
        let ticking = false;

        const updateParallax = () => {
            const scrolled = window.pageYOffset;
            const parallaxElements = document.querySelectorAll('[data-parallax]');
            
            parallaxElements.forEach(element => {
                const speed = element.dataset.parallax || 0.5;
                const yPos = -(scrolled * speed);
                element.style.transform = `translateY(${yPos}px)`;
            });
            
            ticking = false;
        };

        const requestTick = () => {
            if (!ticking) {
                requestAnimationFrame(updateParallax);
                ticking = true;
            }
        };

        window.addEventListener('scroll', requestTick, { passive: true });
    }

    /**
     * Scroll suave con easing personalizado
     */
    setupSmoothScrolling() {
        // Smooth scrolling para navegación interna
        document.addEventListener('click', (e) => {
            const link = e.target.closest('[data-smooth-scroll]');
            if (link) {
                e.preventDefault();
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    }

    /**
     * Animaciones basadas en intersection observer
     */
    setupIntersectionObserver() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const animateOnScroll = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    
                    // Agregar clase de animación
                    element.classList.add('animate-fade-in-up');
                    
                    // Delay staggered para elementos hermanos
                    const siblings = Array.from(element.parentNode.children);
                    const index = siblings.indexOf(element);
                    element.style.animationDelay = `${index * 100}ms`;
                    
                    // Dejar de observar el elemento
                    animateOnScroll.unobserve(element);
                }
            });
        }, observerOptions);

        // Observar elementos que deben animarse
        const elementsToAnimate = document.querySelectorAll('.product-card, .category-section, .stats-card');
        elementsToAnimate.forEach(el => animateOnScroll.observe(el));
    }

    /**
     * Feedback táctil mejorado para dispositivos móviles
     */
    setupTouchFeedback() {
        const addRippleEffect = (element, event) => {
            const ripple = document.createElement('span');
            const rect = element.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = event.clientX - rect.left - size / 2;
            const y = event.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s ease-out;
                pointer-events: none;
                z-index: 1000;
            `;
            
            element.style.position = 'relative';
            element.style.overflow = 'hidden';
            element.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        };

        // Aplicar efecto ripple a botones y cards
        document.addEventListener('click', (e) => {
            const element = e.target.closest('.btn-ripple, .card-modern, button');
            if (element && !element.classList.contains('no-ripple')) {
                addRippleEffect(element, e);
            }
        });
    }

    /**
     * Animaciones de carga premium
     */
    setupLoadingAnimations() {
        // Skeleton loading con shimmer effect
        const createSkeleton = (container, type = 'card') => {
            const skeletonTemplates = {
                card: `
                    <div class="animate-pulse bg-white rounded-3xl p-4 space-y-4">
                        <div class="h-32 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-2xl animate-shimmer"></div>
                        <div class="space-y-2">
                            <div class="h-4 bg-gray-200 rounded-lg w-3/4"></div>
                            <div class="h-3 bg-gray-200 rounded-lg w-1/2"></div>
                        </div>
                        <div class="flex justify-between items-center">
                            <div class="h-4 bg-gray-200 rounded-lg w-1/4"></div>
                            <div class="h-8 w-8 bg-gray-200 rounded-xl"></div>
                        </div>
                    </div>
                `,
                header: `
                    <div class="animate-pulse bg-gradient-to-r from-gray-300 to-gray-400 h-48 flex items-center justify-center">
                        <div class="text-white text-lg font-bold">Cargando...</div>
                    </div>
                `
            };
            
            if (container) {
                container.innerHTML = skeletonTemplates[type].repeat(6);
            }
        };

        // Expose para uso global
        window.ModernEffects = window.ModernEffects || {};
        window.ModernEffects.createSkeleton = createSkeleton;
    }

    /**
     * Efectos de hover avanzados
     */
    setupHoverEffects() {
        // Efecto de seguimiento del cursor para cards grandes
        document.addEventListener('mousemove', (e) => {
            const cards = document.querySelectorAll('.card-3d');
            
            cards.forEach(card => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const rotateX = (y - centerY) / 10;
                const rotateY = (centerX - x) / 10;
                
                card.style.transform = `
                    perspective(1000px) 
                    rotateX(${rotateX}deg) 
                    rotateY(${rotateY}deg) 
                    translateZ(20px)
                `;
            });
        });

        // Reset al salir del hover
        document.addEventListener('mouseleave', (e) => {
            if (e.target.classList.contains('card-3d')) {
                e.target.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
            }
        });
    }

    /**
     * Efectos de partículas flotantes
     */
    static createFloatingParticles(container, count = 5) {
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.cssText = `
                width: ${Math.random() * 10 + 5}px;
                height: ${Math.random() * 10 + 5}px;
                background: rgba(168, 85, 247, ${Math.random() * 0.3 + 0.1});
                top: ${Math.random() * 100}%;
                left: ${Math.random() * 100}%;
                animation-duration: ${Math.random() * 3 + 2}s;
                animation-delay: ${Math.random() * 2}s;
            `;
            container.appendChild(particle);
        }
    }

    /**
     * Notificaciones toast modernas
     */
    static showToast(message, type = 'success', duration = 3000) {
        const toast = document.createElement('div');
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        const colors = {
            success: 'from-emerald-500 to-green-600',
            error: 'from-red-500 to-pink-600',
            warning: 'from-yellow-500 to-orange-600',
            info: 'from-blue-500 to-purple-600'
        };

        toast.className = `
            fixed top-4 right-4 z-50 max-w-sm w-full
            bg-gradient-to-r ${colors[type]} text-white
            rounded-2xl shadow-2xl p-4 flex items-center space-x-3
            transform translate-x-full opacity-0
            transition-all duration-500 ease-out
        `;
        
        toast.innerHTML = `
            <div class="flex-shrink-0 text-2xl">${icons[type]}</div>
            <div class="flex-1">
                <p class="font-semibold text-sm">${message}</p>
            </div>
            <button onclick="this.parentElement.remove()" class="flex-shrink-0 text-white/80 hover:text-white transition-colors">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.body.appendChild(toast);

        // Animar entrada
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        }, 100);

        // Auto-remove
        setTimeout(() => {
            toast.style.transform = 'translateX(full)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }, duration);
    }

    /**
     * Loading spinner moderno
     */
    static showLoading(container, message = 'Cargando...') {
        const loader = document.createElement('div');
        loader.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm';
        loader.innerHTML = `
            <div class="bg-white rounded-3xl p-8 shadow-2xl text-center space-y-4 mx-4">
                <div class="relative">
                    <div class="w-16 h-16 border-4 border-purple-200 rounded-full animate-spin border-t-purple-600 mx-auto"></div>
                    <div class="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-purple-400 mx-auto"></div>
                </div>
                <p class="text-gray-700 font-semibold">${message}</p>
            </div>
        `;
        
        if (container) {
            container.appendChild(loader);
        } else {
            document.body.appendChild(loader);
        }
        
        return loader;
    }
}

// Agregar estilos de animación CSS
const addAnimationStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
        
        .card-3d {
            transition: transform 0.3s ease;
        }
        
        .no-select {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
        }
        
        .backdrop-blur-strong {
            backdrop-filter: blur(20px) saturate(180%);
        }
        
        .glass-effect {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
    `;
    document.head.appendChild(style);
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    addAnimationStyles();
    new ModernEffects();
});

// Exportar para uso global
window.ModernEffects = ModernEffects;