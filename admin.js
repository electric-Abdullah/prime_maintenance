// ============================================
// Prime Maintenance Admin Panel
// Uses Server Proxy (Credentials NOT exposed)
// ============================================

// Global Variables
let projectImages = [];
let config = {
    supabaseUrl: null,
    googleSheetId: null
};

// ============================================
// Initialize Configuration from Server
// ============================================
async function initConfig() {
    try {
        console.log('📡 Fetching configuration from /api/config...');
        const response = await fetch('/api/config');
        
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        
        config = await response.json();
        
        if (!config.supabaseUrl || !config.googleSheetId) {
            console.warn('⚠️ Configuration loaded but some values are missing:', config);
            return false;
        }
        
        console.log('✅ Configuration loaded successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to load configuration:', error);
        let errorMsg = 'Could not connect to the server. ';
        if (window.location.protocol === 'file:') {
            errorMsg += 'Please run the server (npm start) and access the panel via http://localhost.';
        } else {
            errorMsg += 'Check if the backend server is running and the .env file is configured.';
        }
        showAlert(errorMsg, 'error');
        return false;
    }
}

// ============================================
// Generic Supabase Proxy Call
// ============================================
async function supabaseCall(table, method = 'GET', query = null, data = null) {
    try {
        const payload = { table, method, query, data };
        console.log(`📤 Sending ${method} request to ${table}`);
        
        const response = await fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        console.log(`📥 Response status: ${response.status}`);
        
        const responseData = await response.json();
        
        if (!response.ok) {
            const errorMsg = responseData.error || responseData.message || `HTTP ${response.status}`;
            console.error(`❌ Error: ${errorMsg}`);
            throw new Error(errorMsg);
        }
        
        console.log(`✅ Success from ${table}`);
        return responseData;
    } catch (error) {
        console.error('❌ Supabase call error:', error);
        throw error;
    }
}

// ============================================
// Initialize on Page Load
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Admin Panel Loading...');
    
    try {
        // Show loading indicator
        showAlert('Initializing Admin Panel...', 'success');
        
        // Initialize Configuration
        const configLoaded = await initConfig();
        
        if (configLoaded) {
            // Load all data with error handling
            console.log('Loading projects...');
            await loadProjects().catch(e => console.warn('Warning: Could not load projects:', e));
            
            console.log('Loading testimonials...');
            await loadTestimonials().catch(e => console.warn('Warning: Could not load testimonials:', e));
            
            console.log('Updating stats...');
            await updateStats().catch(e => console.warn('Warning: Could not update stats:', e));
            
            showAlert('Admin Panel Ready! ✅', 'success');
        } else {
            showAlert('Warning: Could not connect to database. Some features may not work.', 'error');
        }
    } catch (error) {
        console.error('Error during initialization:', error);
        showAlert('Initialization error: ' + error.message, 'error');
    }
    
    // Setup event listeners regardless of initialization state
    setupEventListeners();
    
    console.log('✅ Admin Panel Loaded!');
});

function setupEventListeners() {
    // Project images input
    const projectImagesInput = document.getElementById('projectImagesInput');
    if (projectImagesInput) {
        projectImagesInput.addEventListener('change', handleProjectImagesSelect);
    }
}

// ============================================
// Profile Photo Functions (Base64 in Database)
// ============================================
// ============================================
// Projects Functions (Base64 Images in Database)
// ============================================
function handleProjectImagesSelect(e) {
    const files = Array.from(e.target.files);
    projectImages = [];
    
    let processedCount = 0;
    
    files.forEach(file => {
        if (file.type.startsWith('image/')) {
            // Check file size
            if (file.size > 2 * 1024 * 1024) {
                showAlert('Some images are too large! Please use images under 2MB each', 'error');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(event) {
                projectImages.push(event.target.result);
                processedCount++;
                
                if (processedCount === files.length) {
                    displayProjectImagesPreview();
                }
            };
            reader.readAsDataURL(file);
        }
    });
}

function displayProjectImagesPreview() {
    const container = document.getElementById('projectImagesPreview');
    if (!container) return;
    
    container.innerHTML = '';
    
    projectImages.forEach((img, index) => {
        const div = document.createElement('div');
        div.className = 'preview-item';
        div.innerHTML = `
            <img src="${img}" alt="Preview ${index + 1}">
            <button class="remove-btn" onclick="removeProjectImage(${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(div);
    });
}

function removeProjectImage(index) {
    projectImages.splice(index, 1);
    displayProjectImagesPreview();
}

async function addProject() {
    const title = document.getElementById('projectTitle').value.trim();
    const category = document.getElementById('projectCategory').value;
    const location = document.getElementById('projectLocation').value.trim();
    const description = document.getElementById('projectDescription').value.trim();
    
    if (!title || !description) {
        showAlert('Please fill in project title and description!', 'error');
        return;
    }
    
    if (projectImages.length === 0) {
        showAlert('Please upload at least one project photo!', 'error');
        return;
    }
    
    try {
        showAlert('Saving project...', 'success');
        
        console.log('Adding project:', { title, category, location, description, imageCount: projectImages.length });
        
        // Save project through server proxy
        const result = await supabaseCall('projects', 'POST', null, {
            title: title,
            category: category,
            location: location,
            description: description,
            images: projectImages // Save as array of base64 strings
        });
        
        console.log('Project added successfully:', result);
        
        // Clear form
        document.getElementById('projectTitle').value = '';
        document.getElementById('projectLocation').value = '';
        document.getElementById('projectDescription').value = '';
        document.getElementById('projectImagesInput').value = '';
        projectImages = [];
        document.getElementById('projectImagesPreview').innerHTML = '';
        
        showAlert('Project added successfully!', 'success');
        await loadProjects();
        await updateStats();
    } catch (error) {
        console.error('Error adding project:', error);
        showAlert('Error adding project: ' + error.message, 'error');
    }
}

async function loadProjects() {
    try {
        const data = await supabaseCall('projects', 'GET', {
            select: '*',
            order: 'created_at.desc'
        });
        
        const container = document.getElementById('projectsList');
        if (!container) return;
        
        if (!data || !Array.isArray(data) || data.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No projects added yet</p>';
            return;
        }
        
        container.innerHTML = '';
        data.forEach((project) => {
            const div = document.createElement('div');
            div.style.cssText = 'background: var(--light-gray); padding: 20px; border-radius: 10px; margin-bottom: 20px; position: relative;';
            
            const images = Array.isArray(project.images) ? project.images : [];
            const imagesHtml = images.slice(0, 3).map(img => 
                `<img src="${img}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 5px; margin-right: 10px;">`
            ).join('');
            
            div.innerHTML = `
                <button onclick="deleteProject('${project.id}')" style="position: absolute; top: 15px; right: 15px; background: var(--accent-red); color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">
                    <i class="fas fa-trash"></i> Delete
                </button>
                <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                    ${imagesHtml}
                    ${images.length > 3 ? `<div style="width: 80px; height: 80px; background: var(--primary-blue); color: white; display: flex; align-items: center; justify-content: center; border-radius: 5px; font-weight: bold;">+${images.length - 3}</div>` : ''}
                </div>
                <h3 style="color: var(--primary-dark); margin-bottom: 8px;">
                    <span style="background: var(--primary-blue); color: white; padding: 3px 10px; border-radius: 3px; font-size: 0.8rem; margin-right: 10px;">${project.category}</span>
                    ${project.title}
                </h3>
                ${project.location ? `<p style="color: #666; margin-bottom: 8px;"><i class="fas fa-map-marker-alt"></i> ${project.location}</p>` : ''}
                <p style="color: #333; line-height: 1.6;">${project.description}</p>
                <small style="color: #999; font-style: italic; margin-top: 10px; display: block;">${new Date(project.created_at).toLocaleDateString()}</small>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

async function deleteProject(id) {
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    try {
        const result = await supabaseCall('projects', 'DELETE', {
            'id': `eq.${id}`
        });
        
        showAlert('Project deleted successfully!', 'success');
        await loadProjects();
        await updateStats();
    } catch (error) {
        console.error('Error deleting project:', error);
        showAlert('Error deleting project: ' + error.message, 'error');
    }
}

// ============================================
// Testimonials Functions
// ============================================
async function addTestimonial() {
    const name = document.getElementById('clientName').value.trim();
    const title = document.getElementById('clientTitle').value.trim();
    const rating = document.getElementById('clientRating').value;
    const message = document.getElementById('clientMessage').value.trim();
    
    if (!name || !message) {
        showAlert('Please fill in client name and message!', 'error');
        return;
    }
    
    try {
        showAlert('Saving testimonial...', 'success');
        
        console.log('Adding testimonial:', { name, title, rating, message });
        
        const result = await supabaseCall('testimonials', 'POST', null, {
            client_name: name,
            client_title: title || 'Client',
            rating: parseInt(rating),
            message: message
        });
        
        console.log('Testimonial added successfully:', result);
        
        // Clear form
        document.getElementById('clientName').value = '';
        document.getElementById('clientTitle').value = '';
        document.getElementById('clientMessage').value = '';
        document.getElementById('clientRating').value = '5';
        
        showAlert('Testimonial added successfully!', 'success');
        await loadTestimonials();
        await updateStats();
    } catch (error) {
        console.error('Error adding testimonial:', error);
        showAlert('Error adding testimonial: ' + error.message, 'error');
    }
}

async function loadTestimonials() {
    try {
        const data = await supabaseCall('testimonials', 'GET', {
            select: '*',
            order: 'created_at.desc'
        });
        
        const container = document.getElementById('testimonialList');
        if (!container) return;
        
        if (!data || !Array.isArray(data) || data.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No testimonials yet</p>';
            return;
        }
        
        container.innerHTML = '';
        data.forEach((testimonial) => {
            const stars = '⭐'.repeat(testimonial.rating);
            const div = document.createElement('div');
            div.className = 'testimonial-item';
            div.innerHTML = `
                <button class="delete-btn" onclick="deleteTestimonial('${testimonial.id}')">
                    <i class="fas fa-trash"></i>
                </button>
                <strong style="color: var(--primary-dark);">${testimonial.client_name}</strong><br>
                <small style="color: #666;">${testimonial.client_title}</small><br>
                <div style="margin: 8px 0;">${stars}</div>
                <p style="color: #333; margin-top: 10px;">"${testimonial.message}"</p>
                <small style="color: #999; font-style: italic;">${new Date(testimonial.created_at).toLocaleDateString()}</small>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading testimonials:', error);
    }
}

async function deleteTestimonial(id) {
    if (!confirm('Are you sure you want to delete this testimonial?')) return;
    
    try {
        const result = await supabaseCall('testimonials', 'DELETE', {
            'id': `eq.${id}`
        });
        
        showAlert('Testimonial deleted successfully!', 'success');
        await loadTestimonials();
        await updateStats();
    } catch (error) {
        console.error('Error deleting testimonial:', error);
        showAlert('Error deleting testimonial: ' + error.message, 'error');
    }
}

// ============================================
// Google Sheets Statistics
// ============================================
async function fetchGoogleSheetsStats() {
    try {
        showAlert('Fetching live statistics from Google Sheets...', 'success');
        
        const response = await fetch('/api/google-sheets?sheet=Sheet1');
        const json = await response.json();
        
        if (!json.table || !json.table.rows) {
            throw new Error('Invalid response structure');
        }
        
        const rows = json.table.rows;
        
        // Parse CCTV Clients data
        let totalClients = 0;
        let totalCameras = 0;
        let commercialCount = 0;
        let residentialCount = 0;
        let industrialCount = 0;
        let remoteAccessCount = 0;
        let installationCount = 0;
        let maintenanceCount = 0;
        let repairingCount = 0;
        
        rows.forEach((row, index) => {
            if (index === 0) return; // Skip header
            
            const cells = row.c;
            if (!cells || !cells[0] || !cells[0].v) return;
            
            totalClients++;
            
            // Total Cameras (column K = index 10)
            if (cells[10] && cells[10].v) {
                totalCameras += parseInt(cells[10].v) || 0;
            }
            
            // Client Type (column G = index 6)
            if (cells[6] && cells[6].v) {
                const type = cells[6].v.toLowerCase();
                if (type.includes('commercial')) commercialCount++;
                else if (type.includes('resedential') || type.includes('residential')) residentialCount++;
                else if (type.includes('industrial')) industrialCount++;
            }
            
            // Remote Access (column M = index 12)
            if (cells[12] && cells[12].v && cells[12].v.toLowerCase() === 'yes') {
                remoteAccessCount++;
            }
            
            // Service Type (column J = index 9)
            if (cells[9] && cells[9].v) {
                const service = cells[9].v.toLowerCase();
                if (service.includes('installation')) installationCount++;
                else if (service.includes('maintenance')) maintenanceCount++;
                else if (service.includes('repairing')) repairingCount++;
            }
        });
        
        const stats = {
            totalClients,
            totalCameras,
            commercialCount,
            residentialCount,
            industrialCount,
            remoteAccessCount,
            installationCount,
            maintenanceCount,
            repairingCount
        };
        
        updateGoogleSheetsUI(stats);
        console.log('📊 Google Sheets Stats:', stats);
        
        return stats;
    } catch (error) {
        console.error('Error fetching Google Sheets:', error);
        showAlert('Could not fetch Google Sheets data', 'error');
        return null;
    }
}

function updateGoogleSheetsUI(stats) {
    const customerCountEl = document.getElementById('customerCount');
    const cameraCountEl = document.getElementById('cameraCount');
    
    if (customerCountEl) customerCountEl.textContent = stats.totalClients;
    if (cameraCountEl) cameraCountEl.textContent = stats.totalCameras;
    
    const resultDiv = document.getElementById('sheetsTestResult');
    if (resultDiv) {
        resultDiv.innerHTML = `
            <div style="background: #d4edda; padding: 15px; border-radius: 5px; color: #155724;">
                <strong><i class="fas fa-check-circle"></i> Live Data from Your CCTV Clients Sheet!</strong>
                <div style="margin-top: 15px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    <div><strong>Total Clients:</strong> ${stats.totalClients}</div>
                    <div><strong>Total Cameras:</strong> ${stats.totalCameras}</div>
                    <div><strong>Commercial:</strong> ${stats.commercialCount}</div>
                    <div><strong>Residential:</strong> ${stats.residentialCount}</div>
                    <div><strong>Industrial:</strong> ${stats.industrialCount}</div>
                    <div><strong>Remote Access:</strong> ${stats.remoteAccessCount}</div>
                    <div><strong>Installations:</strong> ${stats.installationCount}</div>
                    <div><strong>Maintenance:</strong> ${stats.maintenanceCount}</div>
                    <div><strong>Repairs:</strong> ${stats.repairingCount}</div>
                    <div><strong>Avg Cameras/Client:</strong> ${(stats.totalCameras / stats.totalClients).toFixed(1)}</div>
                </div>
            </div>
        `;
    }
}

async function testGoogleSheets() {
    await fetchGoogleSheetsStats();
}

async function saveGoogleSheets() {
    showAlert('Google Sheets URL is pre-configured!', 'success');
}

// ============================================
// Statistics Update
// ============================================
async function updateStats() {
    try {
        const projects = await supabaseCall('projects', 'GET', {
            select: 'id'
        });
        
        const testimonials = await supabaseCall('testimonials', 'GET', {
            select: 'id'
        });
        
        const projectCountEl = document.getElementById('projectCount');
        const testimonialCountEl = document.getElementById('testimonialCount');
        
        if (projectCountEl) projectCountEl.textContent = (projects && Array.isArray(projects)) ? projects.length : 0;
        if (testimonialCountEl) testimonialCountEl.textContent = (testimonials && Array.isArray(testimonials)) ? testimonials.length : 0;
        
        await fetchGoogleSheetsStats();
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// ============================================
// Alert System
// ============================================
function showAlert(message, type) {
    const container = document.getElementById('alertContainer');
    if (!container) {
        console.log(message);
        return;
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} show`;
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
        ${message}
    `;
    
    container.innerHTML = '';
    container.appendChild(alert);
    
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 300);
    }, 3000);
}

// ============================================
// Expose Functions to Window
// ============================================
window.removeProjectImage = removeProjectImage;
window.addProject = addProject;
window.deleteProject = deleteProject;
window.addTestimonial = addTestimonial;
window.deleteTestimonial = deleteTestimonial;
window.saveGoogleSheets = saveGoogleSheets;
window.testGoogleSheets = testGoogleSheets;

console.log('🎉 Prime Maintenance Admin Panel Ready!');
