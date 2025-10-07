# 🗄️ GUÍA DE CONFIGURACIÓN DE SUPABASE STORAGE

## 📋 **Resumen**
Esta guía te ayudará a configurar **Supabase Storage** como almacenamiento gratuito en la nube para las imágenes de tu aplicación Uni-Eats, reemplazando el almacenamiento local que no funciona en Render.

---

## 📊 **LÍMITES DEL PLAN GRATUITO**

### **🆓 Qué incluye gratis:**
- **2 proyectos activos** máximo
- **500MB de base de datos** por proyecto  
- **1GB de almacenamiento (Storage)** por proyecto
- **2GB de transferencia** mensual por proyecto
- **CDN global incluido**

### **💡 Estrategia recomendada:**
- **Proyecto 1**: Tu BD actual + Storage (recomendado)
- **Proyecto 2**: Disponible para otros usos

### **🔄 Si necesitas más:**
- **Plan Pro**: $25/mes por proyecto adicional

## 🎯 **¿Por qué Supabase Storage?**

### ✅ **Ventajas**
- **🆓 GRATIS**: 1GB de almacenamiento + 2GB de transferencia mensual
- **🌐 CDN Global**: Imágenes rápidas en todo el mundo
- **🔒 Seguridad**: Control de acceso granular
- **⚡ Fácil integración**: Compatible con PostgreSQL (que ya usas)
- **📊 Dashboard visual**: Interfaz amigable para gestionar archivos
- **🔄 Mismo proyecto**: Puedes usar tu proyecto de BD existente

### 💰 **Comparación con AWS S3**
| Feature | Supabase Storage | AWS S3 |
|---------|------------------|--------|
| **Precio** | 🆓 1GB gratis | 💰 Pago desde el primer byte |
| **Configuración** | ⚡ Simple | 🔧 Compleja (IAM, buckets, etc.) |
| **CDN** | ✅ Incluido | 💰 CloudFront adicional |
| **Dashboard** | ✅ Visual y fácil | 🔧 Técnico |

---

## 🤔 **¿PROYECTO EXISTENTE O NUEVO?**

### **✅ USAR PROYECTO EXISTENTE (RECOMENDADO)**
Si ya tienes Supabase para tu BD PostgreSQL:

**PROS:**
- ✅ Todo centralizado en un lugar
- ✅ Mismas credenciales (SUPABASE_URL, SUPABASE_ANON_KEY)
- ✅ Ahorras 1 de tus 2 proyectos gratuitos
- ✅ Configuración más simple

**CONTRAS:**
- ⚠️ Storage comparte espacio con BD (pero 1GB es suficiente)

### **🔄 CREAR PROYECTO SEPARADO**
Solo si prefieres separación total:

**PROS:**
- ✅ 1GB completo dedicado a imágenes
- ✅ Independencia total de servicios

**CONTRAS:**  
- ❌ Usas los 2 proyectos gratuitos
- ❌ Credenciales separadas que gestionar
- ❌ Configuración más compleja

---

## 🚀 **CONFIGURACIÓN PASO A PASO**

### **Paso 1: Usar Proyecto Existente o Crear Nuevo**

#### **🎯 OPCIÓN RECOMENDADA: Usar proyecto existente**
Si ya tienes un proyecto de Supabase para la base de datos:
1. **Ir a tu proyecto existente** en [supabase.com](https://supabase.com)
2. **¡Listo!** Puedes usar el mismo proyecto para Storage

#### **🔄 OPCIÓN ALTERNATIVA: Crear proyecto nuevo**
Solo si prefieres separar Storage de la base de datos:
1. **Ir a [supabase.com](https://supabase.com)**
2. **Crear nuevo proyecto**:
   - Nombre: `uni-eats-storage`
   - Región: Elige la más cercana (ej: East US)
   - Database Password: Crear una segura

> **💡 Nota**: Con plan gratuito tienes **2 proyectos máximo**

### **Paso 2: Configurar Storage**

1. **En el dashboard de Supabase**:
   - Ir a `Storage` en el menú lateral
   - Crear un nuevo bucket llamado `uni-eats-images`
   - Marcar como **"Public bucket"** ✅

2. **Configurar políticas de acceso**:
   ```sql
   -- Política para lectura pública
   CREATE POLICY "Public read access" ON storage.objects
   FOR SELECT USING (bucket_id = 'uni-eats-images');
   
   -- Política para subida autenticada (opcional)
   CREATE POLICY "Authenticated upload" ON storage.objects
   FOR INSERT WITH CHECK (bucket_id = 'uni-eats-images');
   ```

### **Paso 3: Obtener Credenciales**

En tu proyecto de Supabase, ir a `Settings` > `API`:

1. **Project URL**: `https://tu-proyecto.supabase.co`
2. **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## ⚙️ **CONFIGURACIÓN EN RENDER**

### **Variables de Entorno en Render**

Agregar las siguientes variables en tu servicio de Render:

```bash
# Supabase Storage Configuration
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key_aqui
SUPABASE_BUCKET=uni-eats-images
SUPABASE_STORAGE_ENABLED=true
```

### **Variables Requeridas**
- `SUPABASE_URL`: URL de tu proyecto Supabase
- `SUPABASE_ANON_KEY`: Clave pública para autenticación
- `SUPABASE_BUCKET`: Nombre del bucket (uni-eats-images)
- `SUPABASE_STORAGE_ENABLED`: `true` para activar Supabase

---

## 🔧 **CÓMO FUNCIONA LA IMPLEMENTACIÓN**

### **Servicio Híbrido** 🔄
```java
// 1. Intenta subir a Supabase Storage
if (supabaseEnabled) {
    return supabaseStorageService.uploadImage(file, folder);
} else {
    // 2. Fallback a almacenamiento local
    return localImageService.uploadImage(file, folder);
}
```

### **URLs Generadas**
- **Supabase**: `https://proyecto.supabase.co/storage/v1/object/public/uni-eats-images/productos/abc123.jpg`
- **Local**: `/uploads/productos/abc123.jpg`

---

## 🌟 **RESULTADO ESPERADO**

### **✅ Con Supabase Configurado**
- ✅ Imágenes visibles en Render
- ✅ URLs públicas accesibles globalmente
- ✅ CDN automático para velocidad
- ✅ 1GB de almacenamiento gratuito

### **🔄 Sin Supabase (Fallback)**
- ✅ Funciona en desarrollo local
- ❌ Imágenes NO visibles en Render
- ⚠️ Solo para desarrollo/testing

---

## 🧪 **PRUEBAS**

### **1. Verificar Configuración**
```bash
# Comprobar que las variables están configuradas
curl "https://tu-app.onrender.com/api/storage/status"
```

### **2. Subir Imagen de Prueba**
1. Ir al panel de vendedor
2. Crear/editar un producto
3. Subir una imagen
4. Verificar que la URL generada es de Supabase

### **3. Verificar URL Pública**
- La imagen debe ser accesible desde cualquier navegador
- URL debe comenzar con `https://tu-proyecto.supabase.co/storage/`

---

## 🛠️ **SOLUCIÓN DE PROBLEMAS**

### **❌ Error: "Supabase Storage no está configurado"**
- ✅ Verificar que `SUPABASE_STORAGE_ENABLED=true`
- ✅ Comprobar `SUPABASE_URL` y `SUPABASE_ANON_KEY`

### **❌ Error 403 al subir imagen**
- ✅ Verificar políticas del bucket en Supabase
- ✅ Asegurar que el bucket es público

### **❌ Imagen no se ve**
- ✅ Verificar que el bucket existe
- ✅ Comprobar políticas de lectura pública

---

## 💡 **TIPS ADICIONALES**

### **🔄 Migración de Imágenes Existentes**
Si ya tienes imágenes locales y quieres migrarlas:
```java
// Función futura para migrar imágenes
imageService.migrateLocalImageToSupabase(localPath, folder);
```

### **📊 Monitoreo de Uso**
- Dashboard de Supabase muestra estadísticas de uso
- Alertas automáticas cuando te acercas al límite

### **🔒 Seguridad**
- Las claves `anon` son seguras para frontend
- Para operaciones administrativas usar `service_role` key

---

## 🎉 **¡LISTO!**

Con esta configuración:
- ✅ **Las imágenes funcionarán en Render**
- ✅ **Almacenamiento gratuito y confiable**
- ✅ **CDN global incluido**
- ✅ **Fácil escalabilidad**

¡Tu marketplace ya tiene almacenamiento profesional en la nube! 🚀