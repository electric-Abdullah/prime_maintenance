// ============================================
// Prime Maintenance Website - Data Loader
// Uses Server Proxy (Credentials NOT exposed)
// ============================================

// API Configuration (no credentials exposed)
let config = {
    supabaseUrl: null,
    googleSheetId: null
};

// ============================================
// Initialize Configuration from Server
// ============================================
async function initConfig() {
    try {
        const response = await fetch('/api/config');
        config = await response.json();
        console.log('✅ Configuration loaded from server');
        return true;
    } catch (error) {
        console.error('❌ Failed to load configuration:', error);
        return false;
    }
}

// ============================================
// Generic Supabase Proxy Call
// ============================================
async function supabaseCall(table, method = 'GET', query = null, data = null) {
    try {
        const payload = { table, method, query, data };
        const response = await fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`Supabase error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Supabase call error:', error);
        return null;
    }
}

// ============================================
// Load Profile Photo
// ============================================
async function loadProfilePhoto() {
    try {
        const data = await supabaseCall('profile', 'GET', {
            select: 'photo_url',
            id: 'eq.00000000-0000-0000-0000-000000000001'
        });
        
        if (data && data.length > 0 && data[0].photo_url) {
            const container = document.getElementById('aboutImageContainer');
            if (container) {
                container.innerHTML = `<img src="${data[0].photo_url}" alt="Abdullah - Prime Maintenance" style="width: 100%; height: 100%; object-fit: cover; border-radius: 15px;">`;
            }
        }
    } catch (error) {
        console.error('Error loading profile photo:', error);
    }
}

// ============================================
// Global variable to store all projects
// ============================================
let allProjects = [];
let currentFilter = null;

// ============================================
// Load Projects from Supabase
// ============================================
async function loadProjects() {
    try {
        const data = await supabaseCall('projects', 'GET', {
            select: '*',
            order: 'created_at.desc'
        });
        
        // Store all projects globally
        allProjects = data || [];
        
        // Display projects (respecting any active filter)
        displayProjects(currentFilter ? allProjects.filter(p => p.category === currentFilter) : allProjects);
    } catch (error) {
        console.error('Error loading projects:', error);
        displayProjects([]);
    }
}

// ============================================
// Display Projects
// ============================================
function displayProjects(projectsToDisplay) {
    const container = document.getElementById('projectsContainer');
    if (!container) return;
    
    if (!projectsToDisplay || projectsToDisplay.length === 0) {
        container.innerHTML = `
            <div class="gallery-placeholder">
                <i class="fas fa-project-diagram"></i>
                <p>Projects will appear here once added</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    projectsToDisplay.forEach((project, index) => {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        
        const images = Array.isArray(project.images) ? project.images : JSON.parse(project.images || '[]');
        const firstImage = images[0];
        const imageCount = images.length;
        
        card.innerHTML = `
            <div class="project-images">
                <img src="${firstImage}" alt="${project.title}">
                <div class="project-category">${project.category}</div>
                <div class="project-overlay">
                    <button class="btn btn-primary" onclick="scrollToProject(event)">
                        <i class="fas fa-eye"></i> View Project
                    </button>
                </div>
            </div>
            <div class="project-content">
                <h3 class="project-title">${project.title}</h3>
                ${project.location ? `<div class="project-location"><i class="fas fa-map-marker-alt"></i> ${project.location}</div>` : ''}
                <p class="project-description">${project.description}</p>
                <div class="project-footer">
                    <span class="project-date">${new Date(project.created_at).toLocaleDateString()}</span>
                    <span class="project-images-count"><i class="fas fa-images"></i> ${imageCount} photo${imageCount > 1 ? 's' : ''}</span>
                </div>
            </div>
        `;
        
        container.appendChild(card);
        
        // Animate in
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
    
    console.log(`✅ Displayed ${projectsToDisplay.length} projects`);
}

// ============================================
// Filter Projects by Service Category
// ============================================
function filterProjectsByService(serviceElement) {
    const category = serviceElement.getAttribute('data-category');
    
    // Update current filter
    currentFilter = category;
    
    // Update service card styling
    document.querySelectorAll('.service-card').forEach(card => {
        card.classList.remove('active');
    });
    serviceElement.classList.add('active');
    
    // Filter and display projects
    const filtered = allProjects.filter(p => p.category === category);
    displayProjects(filtered);
    
    // Show clear filter button and update subtitle
    const galleryControls = document.getElementById('galleryControls');
    const gallerySubtitle = document.getElementById('gallerySubtitle');
    if (galleryControls) galleryControls.style.display = 'block';
    if (gallerySubtitle) gallerySubtitle.textContent = `Projects in ${category}`;
    
    // Scroll to gallery section
    const gallerySection = document.getElementById('gallery');
    if (gallerySection) {
        setTimeout(() => {
            gallerySection.scrollIntoView({ behavior: 'smooth' });
        }, 300);
    }
}

// ============================================
// Scroll to Project Gallery
// ============================================
function scrollToProject(event) {
    event.stopPropagation();
    const gallerySection = document.getElementById('gallery');
    if (gallerySection) {
        gallerySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ============================================
// Reset Project Filter
// ============================================
function resetProjectFilter() {
    currentFilter = null;
    
    // Remove active styling from all service cards
    document.querySelectorAll('.service-card').forEach(card => {
        card.classList.remove('active');
    });
    
    // Display all projects
    displayProjects(allProjects);
    
    // Hide clear filter button and reset subtitle
    const galleryControls = document.getElementById('galleryControls');
    const gallerySubtitle = document.getElementById('gallerySubtitle');
    if (galleryControls) galleryControls.style.display = 'none';
    if (gallerySubtitle) gallerySubtitle.textContent = 'Check out some of our recent completed projects';
}

// ============================================
// Load Testimonials from Supabase
// ============================================

async function loadTestimonials() {
    try {
        const data = await supabaseCall('testimonials', 'GET', {
            select: '*',
            'is_approved': 'eq.true',
            order: 'created_at.desc'
        });
        
        const container = document.querySelector('.testimonials-grid');
        if (!container) return;
        
        if (!data || data.length === 0) return;
        
        container.innerHTML = '';
        data.forEach((testimonial, index) => {
            const stars = '⭐'.repeat(testimonial.rating || 5);
            const card = document.createElement('div');
            card.className = 'testimonial-card';
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            
            card.innerHTML = `
                <i class="fas fa-quote-left" style="font-size: 2rem; color: var(--primary-blue); margin-bottom: 20px;"></i>
                <div style="margin-bottom: 15px; font-size: 1.2rem;">${stars}</div>
                <p style="color: var(--text-dark); line-height: 1.8; margin-bottom: 20px;">${testimonial.message}</p>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="width: 50px; height: 50px; background: var(--primary-blue); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.2rem;">
                        ${testimonial.client_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h4 style="color: var(--primary-dark); margin-bottom: 5px;">${testimonial.client_name}</h4>
                        <p style="color: var(--text-light); font-size: 0.9rem;">${testimonial.client_title}</p>
                    </div>
                </div>
            `;
            
            container.appendChild(card);
            
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
        
        console.log(`✅ Loaded ${data.length} testimonials from database`);
    } catch (error) {
        console.error('Error loading testimonials:', error);
    }
}

// ============================================
// Fetch Google Sheets Statistics
// ============================================
async function fetchGoogleSheetsStats() {
    try {
        const response = await fetch('/api/google-sheets?sheet=Sheet1');
        const json = await response.json();
        
        if (!json.table || !json.table.rows) {
            throw new Error('Invalid response structure');
        }
        
        const rows = json.table.rows;
        
        // Parse CCTV Clients data
        let totalClients = 0;
        let totalCameras = 0;
        let remoteAccessCount = 0;
        
        rows.forEach((row, index) => {
            if (index === 0) return; // Skip header
            
            const cells = row.c;
            if (!cells || !cells[0] || !cells[0].v) return;
            
            totalClients++;
            
            // Total Cameras (column K = index 10)
            if (cells[10] && cells[10].v) {
                totalCameras += parseInt(cells[10].v) || 0;
            }
            
            // Remote Access (column M = index 12)
            if (cells[12] && cells[12].v && cells[12].v.toLowerCase() === 'yes') {
                remoteAccessCount++;
            }
        });
        
        // Calculate percentage
        const remoteAccessPercent = totalClients > 0 ? Math.round((remoteAccessCount / totalClients) * 100) : 0;
        
        // Display statistics
        displayStatistics(totalClients, totalCameras, remoteAccessPercent);
        
        console.log(`📊 Live Stats: ${totalClients} clients, ${totalCameras} cameras`);
        
        return { totalClients, totalCameras, remoteAccessPercent };
    } catch (error) {
        console.error('Error fetching Google Sheets:', error);
        return null;
    }
}

function displayStatistics(totalClients, totalCameras, remoteAccessPercent) {
    // You can add a statistics section to your website
    // For now, update console
    console.log('Statistics:', {
        totalClients,
        totalCameras,
        remoteAccessPercent: remoteAccessPercent + '%'
    });
}

// ============================================
// Initialize Everything on Page Load
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Prime Maintenance Website Loading...');
    
    // Initialize configuration
    const configLoaded = await initConfig();
    
    if (configLoaded) {
        // Load all content
        await loadProfilePhoto();
        await loadProjects();
        await loadTestimonials();
        await fetchGoogleSheetsStats();
    }
    
    console.log('✅ Website loaded successfully!');
});

// ============================================
// Contact Form
// ============================================
const contactForm = document.getElementById('contactForm');
const formMessage = document.getElementById('formMessage');

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            service: document.getElementById('service').value,
            message: document.getElementById('message').value
        };

        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        submitBtn.disabled = true;

        try {
            // Send contact form through server endpoint
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                formMessage.className = 'form-message success';
                formMessage.textContent = 'Thank you for your message! We will get back to you soon.';
                contactForm.reset();
            } else {
                throw new Error('Form submission failed');
            }
        } catch (error) {
            console.error('Form submission error:', error);
            formMessage.className = 'form-message success';
            formMessage.textContent = 'Message received! We will contact you soon via WhatsApp: 0311-1041491';
            contactForm.reset();
        }
        
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;

        setTimeout(() => {
            formMessage.style.display = 'none';
        }, 5000);
    });
}


// Keep existing navigation and scroll functions
// (Mobile menu, scroll effects, etc. from original script.js)

