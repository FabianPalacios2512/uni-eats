# 🎯 CONFIGURACIÓN PARA TU PROYECTO "unieatsdb"

## ✅ **DECISIÓN CONFIRMADA: USAR PROYECTO EXISTENTE**

Perfecto, ya tienes el proyecto **"unieatsdb"** en Supabase. Vamos a configurar Storage en ese mismo proyecto.

---

## 🚀 **PASO A PASO ESPECÍFICO PARA TU CASO**

### **1. Acceder a tu proyecto**
- ✅ Hacer clic en **"unieatsdb"** en tu dashboard
- ✅ Esperar a que cargue el proyecto

### **2. Configurar Storage**
1. **En el menú lateral izquierdo**, buscar y hacer clic en **"Storage"**
2. **Crear nuevo bucket**:
   - Nombre: `uni-eats-images`
   - ✅ Marcar como **"Public bucket"** (importante)
   - Hacer clic en **"Create bucket"**

### **3. Configurar políticas de acceso**
En la sección **"Policies"** del bucket:
```sql
-- Permitir lectura pública de imágenes
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'uni-eats-images');

-- Permitir subir archivos (opcional, para mayor seguridad)
CREATE POLICY "Authenticated upload" ON storage.objects  
FOR INSERT WITH CHECK (bucket_id = 'uni-eats-images');
```

### **4. Obtener credenciales (que ya tienes)**
Como ya usas este proyecto para la BD, ya tienes:
- ✅ **SUPABASE_URL**: La URL de tu proyecto unieatsdb
- ✅ **SUPABASE_ANON_KEY**: La clave pública que ya usas

### **5. Variables en Render**
Agregar estas nuevas variables (manteniendo las existentes de BD):
```env
# Storage Configuration (NUEVAS)
SUPABASE_BUCKET=uni-eats-images
SUPABASE_STORAGE_ENABLED=true

# Las siguientes YA LAS TIENES para la BD
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_clave_existente
```

---

## 🎉 **VENTAJAS DE ESTA CONFIGURACIÓN**

- ✅ **Todo centralizado** en un proyecto
- ✅ **Mismas credenciales** para BD y Storage  
- ✅ **Te queda 1 proyecto libre** para otros usos
- ✅ **Configuración mínima** - solo agregar 2 variables nuevas
- ✅ **1GB completo** para imágenes (la BD no usa mucho espacio)

---

## 📋 **CHECKLIST RÁPIDO**

- [ ] Clic en proyecto "unieatsdb"
- [ ] Ir a Storage → Create bucket → "uni-eats-images" (público)
- [ ] Configurar políticas de acceso
- [ ] Agregar variables en Render: `SUPABASE_BUCKET` y `SUPABASE_STORAGE_ENABLED=true`
- [ ] ✅ ¡Listo! Imágenes funcionando en Render

---

## 🔥 **SIGUIENTE PASO**

**Hacer clic en "unieatsdb"** y seguir a la configuración de Storage. 

¿Necesitas ayuda con algún paso específico una vez que entres al proyecto?