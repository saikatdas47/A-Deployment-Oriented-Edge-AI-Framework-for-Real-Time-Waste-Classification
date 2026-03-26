const api = {
    async call(action, data = {}) {
        try {
            const response = await fetch('api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...data })
            });
            const result = await response.json();
            if (result.error) {
                throw new Error(result.error);
            }
            return result;
        } catch (error) {
            console.error('API Error:', error);
            alert('Error: ' + error.message);
            return null;
        }
    },

    async verifyAdmin(username, password) {
        return this.call('verifyAdmin', { username, password });
    },

    async verifyUser(voterId, fingerId) {
        return this.call('verifyUser', { voterId, fingerId });
    },

    async addUser(data) {
        return this.call('addUser', data);
    },

    async updateUser(id, data) {
        return this.call('updateUser', { id, ...data });
    },

    async getData() {
        return this.call('getData');
    },

    async getDisposals() {
        return this.call('getDisposals');
    },

    async addBin(data) {
        return this.call('addBin', data);
    },

    async updateBin(id, data) {
        return this.call('updateBin', { id, ...data });
    },

    async redeemReward(userId, rewardId, points) {
        return this.call('redeemReward', { userId, rewardId, points });
    },

    async deleteBin(id) {
        return this.call('deleteBin', { id });
    },

    async markNotificationRead(id) {
        return this.call('markNotificationRead', { id });
    }
};

let map;
let markers = [];

document.addEventListener('DOMContentLoaded', function() {
    // Check for existing session
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const currentAdmin = JSON.parse(sessionStorage.getItem('currentAdmin'));

    if (currentUser) {
        showUserDashboard(currentUser);
    } else if (currentAdmin) {
        showAdminDashboard();
    } else {
        showAdminLogin();
    }

    setupEventListeners();
});

function setupEventListeners() {
    // Admin login
    document.getElementById('admin-login-form').addEventListener('submit', async e => {
        e.preventDefault();
        const username = document.getElementById('admin-username').value;
        const password = document.getElementById('admin-password').value;
        const admin = await api.verifyAdmin(username, password);
        if (admin) {
            sessionStorage.setItem('currentAdmin', JSON.stringify(admin));
            showAdminDashboard();
        } else {
            alert('Invalid admin credentials');
        }
    });

    // User login
    document.getElementById('user-login-form').addEventListener('submit', async e => {
        e.preventDefault();
        const voterId = document.getElementById('user-voterid').value;
        const fingerId = document.getElementById('user-fingerid').value;
        const user = await api.verifyUser(voterId, fingerId);
        if (user) {
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            showUserDashboard(user);
        } else {
            alert('Invalid VoterID or FingerID');
        }
    });

    // User registration
    document.getElementById('user-register-form').addEventListener('submit', async e => {
        e.preventDefault();
        const voterId = document.getElementById('register-voterid').value;
        const name = document.getElementById('register-name').value;
        const fingerId = document.getElementById('register-fingerid').value;
        const result = await api.addUser({ voterId, name, fingerId });
        if (result && result.ok) {
            alert('Registration successful! Please login.');
            showUserLogin();
        } else {
            alert('Registration failed.');
        }
    });

    // Navigation
    document.getElementById('switch-to-user').addEventListener('click', showUserLogin);
    document.getElementById('switch-to-admin').addEventListener('click', showAdminLogin);
    document.querySelectorAll('#show-register').forEach(link => {
        link.addEventListener('click', showUserRegister);
    });

    // Logout
    document.getElementById('admin-logout').addEventListener('click', logout);
    document.getElementById('user-logout').addEventListener('click', logout);

    // Admin dashboard tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => switchAdminTab(tab.dataset.tab));
    });

    // User dashboard tabs
    document.querySelectorAll('.user-tab').forEach(tab => {
        tab.addEventListener('click', () => switchUserTab(tab.dataset.tab));
    });

    // Bin modal
    document.getElementById('add-bin')?.addEventListener('click', () => {
        document.getElementById('bin-modal-title').textContent = 'Add Bin';
        document.getElementById('bin-form').reset();
        document.getElementById('bin-form').dataset.id = '';
        document.getElementById('bin-modal').classList.remove('hidden');
    });

    document.getElementById('cancel-bin')?.addEventListener('click', () => {
        document.getElementById('bin-modal').classList.add('hidden');
    });

    document.getElementById('bin-form')?.addEventListener('submit', async e => {
        e.preventDefault();
        const form = e.target;
        const id = form.dataset.id;
        const data = {
            binId: form.binId.value,
            name: form.name.value,
            zone: form.zone.value,
            location: form.location.value,
            lat: parseFloat(form.lat.value),
            lng: parseFloat(form.lng.value)
        };
        const result = id ? await api.updateBin(id, data) : await api.addBin(data);
        if (result) {
            showAdminDashboard();
            document.getElementById('bin-modal').classList.add('hidden');
        }
    });

    // Time range slider
    const timeRange = document.getElementById('time-range');
    const rangeValue = document.getElementById('range-value');
    timeRange?.addEventListener('input', () => {
        rangeValue.textContent = timeRange.value;
        const user = JSON.parse(sessionStorage.getItem('currentUser'));
        if (user) {
            loadRewardsTimeChart(filterDisposalsByRange(window.disposals, timeRange.value), document.getElementById('chart-period').value);
        }
    });

    // Chart period switch
    document.getElementById('chart-period')?.addEventListener('change', e => {
        const user = JSON.parse(sessionStorage.getItem('currentUser'));
        if (user) {
            loadRewardsTimeChart(filterDisposalsByRange(window.disposals, timeRange.value), e.target.value);
        }
    });

    // Analysis chart filters
    document.getElementById('analysis-waste-type')?.addEventListener('change', () => loadDetailedAnalysisChart(window.disposals, window.bins));
    document.getElementById('analysis-bin')?.addEventListener('change', () => loadDetailedAnalysisChart(window.disposals, window.bins));
    document.getElementById('analysis-period')?.addEventListener('change', () => loadDetailedAnalysisChart(window.disposals, window.bins));
}

function logout() {
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentAdmin');
    window.disposals = null;
    window.bins = null;
    if (window.rewardsTimeChart) window.rewardsTimeChart.destroy();
    if (window.rewardsPieChart) window.rewardsPieChart.destroy();
    if (window.detailedAnalysisChart) window.detailedAnalysisChart.destroy();
    showAdminLogin();
}

function showAdminLogin() {
    document.getElementById('admin-login').classList.remove('hidden');
    document.getElementById('user-login').classList.add('hidden');
    document.getElementById('user-register').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.add('hidden');
    document.getElementById('user-dashboard').classList.add('hidden');
}

function showUserLogin() {
    document.getElementById('user-login').classList.remove('hidden');
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('user-register').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.add('hidden');
    document.getElementById('user-dashboard').classList.add('hidden');
}

function showUserRegister() {
    document.getElementById('user-register').classList.remove('hidden');
    document.getElementById('user-login').classList.add('hidden');
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.add('hidden');
    document.getElementById('user-dashboard').classList.add('hidden');
}

function switchAdminTab(tab) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('bg-green-600', 'text-white'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('bg-green-600', 'text-white');
    document.getElementById(`admin-${tab}`).classList.add('active');
    if (tab === 'bins') {
        initMap();
    }
}

function switchUserTab(tab) {
    document.querySelectorAll('.user-tab').forEach(t => t.classList.remove('bg-green-600', 'text-white'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('bg-green-600', 'text-white');
    document.getElementById(`user-${tab}`).classList.add('active');
    if (tab === 'map') {
        initMap();
    }
}

function initMap() {
    if (map) {
        map.remove();
    }
    map = L.map('map').setView([23.8103, 90.4125], 13); // Center on Dhaka
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    api.getData().then(data => {
        markers.forEach(marker => map.removeLayer(marker));
        markers = data.bins.map(bin => {
            const statusClass = bin.status === 'FULL' ? 'full' : bin.status === 'NEAR_FULL' ? 'warning' : bin.status === 'OFFLINE' ? 'offline' : '';
            const marker = L.marker([bin.lat, bin.lng], {
                icon: L.divIcon({
                    className: `bin-marker ${statusClass}`,
                    html: `<div>${bin.binId}</div>`
                })
            }).addTo(map);
            marker.bindPopup(`
                <b>${bin.name}</b><br>
                Zone: ${bin.zone}<br>
                Location: ${bin.location}<br>
                Fill: ${bin.trashLevel}%<br>
                Status: ${bin.status}
            `);
            return marker;
        });
    });
}

async function showAdminDashboard() {
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    const data = await api.getData();
    loadAdminBins(data.bins);
    loadAdminUsers(data.users);
    loadAdminDisposals(data.disposals);
    loadAdminNotifications(data.notifications);
    initMap();
}

async function showUserDashboard(user) {
    document.getElementById('user-login').classList.add('hidden');
    document.getElementById('user-dashboard').classList.remove('hidden');
    document.getElementById('user-name').textContent = user.Name;
    document.getElementById('reward-points-display').textContent = user.points || 0;
    document.getElementById('reward-points-display-main').textContent = user.points || 0;

    const data = await api.getData();
    window.disposals = data.disposals.filter(d => d.user_id == user.id); // Strict equality for user_id
    window.bins = data.bins;

    // Calculate points by waste type
    const pointsByType = {
        plastic: window.disposals.filter(d => d.waste_type.toLowerCase() === 'plastic').reduce((sum, d) => sum + (parseInt(d.points) || 0), 0),
        paper: window.disposals.filter(d => d.waste_type.toLowerCase() === 'paper').reduce((sum, d) => sum + (parseInt(d.points) || 0), 0),
        glass: window.disposals.filter(d => d.waste_type.toLowerCase() === 'glass').reduce((sum, d) => sum + (parseInt(d.points) || 0), 0),
        metal: window.disposals.filter(d => d.waste_type.toLowerCase() === 'metal').reduce((sum, d) => sum + (parseInt(d.points) || 0), 0),
        organic: window.disposals.filter(d => d.waste_type.toLowerCase() === 'organic').reduce((sum, d) => sum + (parseInt(d.points) || 0), 0)
    };

    // Update points breakdown
    document.getElementById('plastic-points').textContent = `${pointsByType.plastic} pts`;
    document.getElementById('paper-points').textContent = `${pointsByType.paper} pts`;
    document.getElementById('glass-points').textContent = `${pointsByType.glass} pts`;
    document.getElementById('metal-points').textContent = `${pointsByType.metal} pts`;
    document.getElementById('organic-points').textContent = `${pointsByType.organic} pts`;

    // Load charts if disposals exist
    if (window.disposals.length > 0) {
        loadRewardsTimeChart(window.disposals, 'monthly');
        loadRewardsPieChart(window.disposals);
        loadDetailedAnalysisChart(window.disposals, window.bins);
    } else {
        // Display fallback for no disposals
        document.getElementById('rewards-time-chart').parentElement.innerHTML += '<p class="text-gray-500 text-center mt-4 chart-fallback">No disposal data available yet.</p>';
        document.getElementById('rewards-pie-chart').parentElement.innerHTML += '<p class="text-gray-500 text-center mt-4 chart-fallback">No disposal data available yet.</p>';
        document.getElementById('detailed-analysis-chart').parentElement.innerHTML += '<p class="text-gray-500 text-center mt-4 chart-fallback">No disposal data available yet.</p>';
    }

    loadRewardsList(user.points || 0);
    loadRedeemedHistory();
}

function loadAdminBins(bins) {
    const binList = document.getElementById('bin-list');
    binList.innerHTML = bins.map(bin => `
        <tr class="hover:bg-green-50">
            <td class="py-2 px-4 border-b">${bin.binId}</td>
            <td class="py-2 px-4 border-b">${bin.name}</td>
            <td class="py-2 px-4 border-b">${bin.zone}</td>
            <td class="py-2 px-4 border-b">${bin.location}</td>
            <td class="py-2 px-4 border-b">
                <div class="progress-bar bg-gray-200 rounded-full h-2.5">
                    <div class="bg-green-600 h-2.5 rounded-full" style="width: ${bin.trashLevel}%"></div>
                </div>
            </td>
            <td class="py-2 px-4 border-b">${bin.status}</td>
            <td class="py-2 px-4 border-b">
                <button class="text-blue-600 hover:underline edit-bin" data-id="${bin.id}">Edit</button>
                <button class="text-red-600 hover:underline delete-bin" data-id="${bin.id}">Delete</button>
            </td>
        </tr>
    `).join('');
    document.querySelectorAll('.edit-bin').forEach(btn => {
        btn.addEventListener('click', () => {
            const bin = bins.find(b => b.id == btn.dataset.id);
            document.getElementById('bin-modal-title').textContent = 'Edit Bin';
            document.getElementById('bin-id').value = bin.binId;
            document.getElementById('bin-name').value = bin.name;
            document.getElementById('bin-zone').value = bin.zone;
            document.getElementById('bin-location').value = bin.location;
            document.getElementById('bin-lat').value = bin.lat;
            document.getElementById('bin-lng').value = bin.lng;
            document.getElementById('bin-form').dataset.id = bin.id;
            document.getElementById('bin-modal').classList.remove('hidden');
        });
    });
    document.querySelectorAll('.delete-bin').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm('Delete this bin?')) {
                const result = await api.deleteBin(btn.dataset.id);
                if (result) {
                    showAdminDashboard();
                }
            }
        });
    });
}

function loadAdminUsers(users) {
    const userList = document.getElementById('user-list');
    userList.innerHTML = users.map(user => `
        <tr class="hover:bg-green-50">
            <td class="py-2 px-4 border-b">${user.VoterID}</td>
            <td class="py-2 px-4 border-b">${user.Name}</td>
            <td class="py-2 px-4 border-b">${user.points || 0}</td>
            <td class="py-2 px-4 border-b">${user.role}</td>
            <td class="py-2 px-4 border-b">
                <button class="text-blue-600 hover:underline edit-user" data-id="${user.id}">Edit</button>
            </td>
        </tr>
    `).join('');
    document.querySelectorAll('.edit-user').forEach(btn => {
        btn.addEventListener('click', () => {
            const user = users.find(u => u.id == btn.dataset.id);
            alert(`Edit user ${user.Name} (ID: ${user.id}) - Functionality to be implemented.`);
        });
    });
}

function loadAdminDisposals(disposals) {
    const disposalList = document.getElementById('disposal-list');
    disposalList.innerHTML = disposals.map(d => `
        <tr class="hover:bg-green-50">
            <td class="py-2 px-4 border-b">${d.user_id || 'N/A'}</td>
            <td class="py-2 px-4 border-b">${d.bin_id}</td>
            <td class="py-2 px-4 border-b">${d.waste_type}</td>
            <td class="py-2 px-4 border-b">${d.points || 0}</td>
            <td class="py-2 px-4 border-b">${new Date(d.timestamp).toLocaleString()}</td>
        </tr>
    `).join('');
}

function loadAdminNotifications(notifications) {
    const notificationList = document.getElementById('notification-list');
    notificationList.innerHTML = notifications.map(n => `
        <div class="bg-white p-4 rounded-lg shadow flex justify-between items-center transform hover:scale-105 transition-transform">
            <div>
                <p class="font-semibold">${n.message}</p>
                <p class="text-sm text-gray-600">${n.type} - ${new Date(n.created_at).toLocaleString()}</p>
            </div>
            <button class="text-blue-600 hover:underline mark-read" data-id="${n.id}" ${n.status === 'READ' ? 'disabled' : ''}>
                ${n.status === 'READ' ? 'Read' : 'Mark as Read'}
            </button>
        </div>
    `).join('');
    document.querySelectorAll('.mark-read').forEach(btn => {
        btn.addEventListener('click', async () => {
            const result = await api.markNotificationRead(btn.dataset.id);
            if (result) {
                showAdminDashboard();
            }
        });
    });
}

function filterDisposalsByRange(disposals, days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return disposals.filter(d => new Date(d.timestamp) >= cutoff);
}

function getPeriodKey(timestamp, period) {
    const date = new Date(timestamp);
    if (period === 'daily') {
        return date.toLocaleDateString();
    } else if (period === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        return weekStart.toLocaleDateString();
    } else if (period === 'monthly') {
        return `${date.getFullYear()}-${date.getMonth() + 1}`;
    } else { // yearly
        return `${date.getFullYear()}`;
    }
}

function groupDisposalsByPeriod(disposals, period) {
    const grouped = {};
    disposals.forEach(d => {
        const key = getPeriodKey(d.timestamp, period);
        grouped[key] = (grouped[key] || 0) + (parseInt(d.points) || 0);
    });
    return Object.fromEntries(Object.entries(grouped).sort());
}

function loadRewardsTimeChart(disposals, period = 'monthly') {
    const ctx = document.getElementById('rewards-time-chart').getContext('2d');
    if (window.rewardsTimeChart) {
        window.rewardsTimeChart.destroy();
    }

    const types = ['plastic', 'paper', 'glass', 'metal', 'organic'];
    const colors = {
        plastic: 'rgba(255, 99, 132, 0.8)',
        paper: 'rgba(54, 162, 235, 0.8)',
        glass: 'rgba(255, 206, 86, 0.8)',
        metal: 'rgba(75, 192, 192, 0.8)',
        organic: 'rgba(153, 102, 255, 0.8)'
    };
    const gradientFills = types.reduce((acc, type) => {
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, colors[type].replace('0.8', '0.5'));
        gradient.addColorStop(1, colors[type].replace('0.8', '0.1'));
        acc[type] = gradient;
        return acc;
    }, {});

    const groupedData = groupDisposalsByPeriod(disposals, period);
    const datasets = types.map(type => {
        const typeData = {};
        Object.keys(groupedData).forEach(key => {
            typeData[key] = disposals
                .filter(d => d.waste_type.toLowerCase() === type && getPeriodKey(d.timestamp, period) === key)
                .reduce((sum, d) => sum + (parseInt(d.points) || 0), 0);
        });
        return {
            label: type.charAt(0).toUpperCase() + type.slice(1),
            data: Object.keys(groupedData).map(key => typeData[key] || 0),
            borderColor: colors[type],
            backgroundColor: gradientFills[type],
            fill: true,
            tension: 0.4,
            pointRadius: 6,
            pointHoverRadius: 10,
            pointBackgroundColor: '#FFFFFF',
            pointBorderWidth: 2
        };
    });

    datasets.push({
        label: 'Total Points',
        data: Object.keys(groupedData).map(key => groupedData[key]),
        borderColor: '#4CAF50',
        backgroundColor: ctx.createLinearGradient(0, 0, 0, 300).addColorStop(0, 'rgba(76, 175, 80, 0.5)').addColorStop(1, 'rgba(76, 175, 80, 0.1)'),
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 10
    });

    const totalPointsByKey = Object.keys(groupedData).reduce((acc, key) => {
        acc[key] = datasets.reduce((sum, ds) => sum + (ds.data[Object.keys(groupedData).indexOf(key)] || 0), 0);
        return acc;
    }, {});
    const peakKey = Object.keys(totalPointsByKey).reduce((a, b) => totalPointsByKey[a] > totalPointsByKey[b] ? a : b, Object.keys(totalPointsByKey)[0] || '');
    const peakValue = totalPointsByKey[peakKey] || 0;

    window.rewardsTimeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Object.keys(groupedData),
            datasets: datasets
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: { family: 'Roboto', size: 12 }, color: '#333', boxWidth: 20, padding: 15 },
                    onClick: (e, legendItem, legend) => {
                        const index = legendItem.datasetIndex;
                        const ci = legend.chart;
                        ci.getDatasetMeta(index).hidden = !ci.getDatasetMeta(index).hidden;
                        ci.update();
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    titleFont: { family: 'Roboto', size: 14 },
                    bodyFont: { family: 'Roboto', size: 12 },
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${context.parsed.y} pts`,
                        footer: (tooltipItems) => {
                            const total = tooltipItems.reduce((sum, ti) => sum + ti.parsed.y, 0);
                            return `Total: ${total} pts`;
                        }
                    }
                },
                annotation: {
                    annotations: peakKey && peakValue > 0 ? [{
                        type: 'line',
                        xMin: peakKey,
                        xMax: peakKey,
                        borderColor: '#FF4444',
                        borderWidth: 2,
                        label: {
                            content: `Peak: ${peakValue} pts`,
                            enabled: true,
                            position: 'top',
                            backgroundColor: '#FF4444',
                            color: '#FFF',
                            font: { family: 'Roboto', size: 12 }
                        }
                    }] : []
                }
            },
            scales: {
                x: {
                    title: { display: true, text: period.charAt(0).toUpperCase() + period.slice(1), font: { family: 'Roboto', size: 14 } },
                    grid: { color: 'rgba(0, 0, 0, 0.05)' }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Points', font: { family: 'Roboto', size: 14 } },
                    grid: { color: 'rgba(0, 0, 0, 0.05)' },
                    stacked: true
                }
            },
            animation: {
                duration: 2000,
                easing: 'easeOutCubic',
                onComplete: () => {
                    if (peakKey) {
                        const chart = window.rewardsTimeChart;
                        if (chart.options.plugins.annotation.annotations[0]) {
                            chart.options.plugins.annotation.annotations[0].label.backgroundColor = '#FF6666';
                            chart.update();
                            setTimeout(() => {
                                chart.options.plugins.annotation.annotations[0].label.backgroundColor = '#FF4444';
                                chart.update();
                            }, 500);
                        }
                    }
                }
            }
        }
    });
}

function loadRewardsPieChart(disposals) {
    const types = ['plastic', 'paper', 'glass', 'metal', 'organic'];
    const pointsByType = types.map(type => 
        disposals.filter(d => d.waste_type.toLowerCase() === type).reduce((sum, d) => sum + (parseInt(d.points) || 0), 0)
    );
    const ctx = document.getElementById('rewards-pie-chart').getContext('2d');
    if (window.rewardsPieChart) {
        window.rewardsPieChart.destroy();
    }
    window.rewardsPieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: types.map(t => t.charAt(0).toUpperCase() + t.slice(1)),
            datasets: [{
                data: pointsByType,
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top', labels: { font: { family: 'Roboto', size: 12 } } },
                tooltip: { callbacks: { label: (context) => `${context.label}: ${context.raw} pts` } }
            },
            animation: { animateScale: true, animateRotate: true }
        }
    });
}

function loadDetailedAnalysisChart(disposals, bins) {
    const ctx = document.getElementById('detailed-analysis-chart').getContext('2d');
    if (window.detailedAnalysisChart) {
        window.detailedAnalysisChart.destroy();
    }

    const wasteTypeFilter = document.getElementById('analysis-waste-type').value;
    const binFilter = document.getElementById('analysis-bin').value;
    const period = document.getElementById('analysis-period').value;

    const binSelect = document.getElementById('analysis-bin');
    binSelect.innerHTML = '<option value="all">All Bins</option>' + bins.map(bin => `<option value="${bin.binId}">${bin.binId} - ${bin.location}</option>`).join('');

    let filteredDisposals = disposals;
    if (wasteTypeFilter !== 'all') {
        filteredDisposals = filteredDisposals.filter(d => d.waste_type.toLowerCase() === wasteTypeFilter);
    }
    if (binFilter !== 'all') {
        filteredDisposals = filteredDisposals.filter(d => d.bin_id == bins.find(b => b.binId === binFilter).id);
    }

    const groupedData = groupDisposalsByPeriod(filteredDisposals, period);
    const types = wasteTypeFilter === 'all' ? ['plastic', 'paper', 'glass', 'metal', 'organic'] : [wasteTypeFilter];
    const colors = {
        plastic: 'rgba(255, 99, 132, 0.8)',
        paper: 'rgba(54, 162, 235, 0.8)',
        glass: 'rgba(255, 206, 86, 0.8)',
        metal: 'rgba(75, 192, 192, 0.8)',
        organic: 'rgba(153, 102, 255, 0.8)'
    };

    const datasets = types.map(type => {
        const typeData = {};
        Object.keys(groupedData).forEach(key => {
            typeData[key] = filteredDisposals
                .filter(d => d.waste_type.toLowerCase() === type && getPeriodKey(d.timestamp, period) === key)
                .reduce((sum, d) => sum + (parseInt(d.points) || 0), 0);
        });
        return {
            label: type.charAt(0).toUpperCase() + type.slice(1),
            data: Object.keys(groupedData).map(key => typeData[key] || 0),
            borderColor: colors[type],
            backgroundColor: ctx.createLinearGradient(0, 0, 0, 300).addColorStop(0, colors[type].replace('0.8', '0.5')).addColorStop(1, colors[type].replace('0.8', '0.1')),
            fill: true,
            tension: 0.4
        };
    });

    window.detailedAnalysisChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Object.keys(groupedData),
            datasets: datasets
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top', labels: { font: { family: 'Roboto', size: 12 } } },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${context.parsed.y} pts`,
                        footer: (tooltipItems) => {
                            const total = tooltipItems.reduce((sum, ti) => sum + ti.parsed.y, 0);
                            return `Total: ${total} pts`;
                        }
                    }
                }
            },
            scales: {
                x: { title: { display: true, text: period.charAt(0).toUpperCase() + period.slice(1), font: { family: 'Roboto', size: 14 } } },
                y: { beginAtZero: true, title: { display: true, text: 'Points', font: { family: 'Roboto', size: 14 } } }
            },
            animation: { duration: 2000, easing: 'easeOutCubic' }
        }
    });
}

function loadRewardsList(userPoints) {
    const rewardsList = document.getElementById('rewards-list');
    const rewards = [
        { id: 1, name: 'Coffee Voucher', points: 50, description: 'Free coffee at participating cafes', image: 'coffee.jpg' },
        { id: 2, name: 'Movie Ticket', points: 100, description: '50% off movie tickets', image: 'movie.jpg' },
        { id: 3, name: 'Shopping Discount', points: 200, description: '20% off at selected stores', image: 'shopping.jpg' }
    ];

    rewardsList.innerHTML = rewards.map(reward => `
        <div class="rewards-card bg-gradient-to-br from-white to-green-50 p-6 rounded-lg shadow-md border border-green-200 transform hover:scale-105 transition-transform duration-300">
            <img src="images/${reward.image}" alt="${reward.name}" class="w-full h-40 object-cover rounded-lg mb-4">
            <h3 class="text-lg font-bold text-gray-800">${reward.name}</h3>
            <p class="text-gray-600 text-sm mb-2">${reward.description}</p>
            <p class="text-green-600 font-semibold mb-4">${reward.points} Points</p>
            <div class="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                <div class="bg-green-600 h-2.5 rounded-full" style="width: ${Math.min((userPoints / reward.points) * 100, 100)}%"></div>
            </div>
            <button class="redeem-btn w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    data-reward-id="${reward.id}" data-points="${reward.points}"
                    ${userPoints >= reward.points ? '' : 'disabled'}>
                ${userPoints >= reward.points ? 'Redeem Now' : 'Insufficient Points'}
            </button>
        </div>
    `).join('');

    document.querySelectorAll('.redeem-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const rewardId = btn.dataset.rewardId;
            const points = parseInt(btn.dataset.points);
            const rewardName = btn.parentElement.querySelector('h3').textContent;
            document.getElementById('redeem-message').textContent = `Redeem ${points} points for ${rewardName}?`;
            document.getElementById('redeem-modal').classList.remove('hidden');

            const confirmRedeem = async () => {
                const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
                const result = await api.redeemReward(currentUser.id, rewardId, points);
                if (result.success) {
                    if (typeof confetti === 'function') {
                        confetti({
                            particleCount: 100,
                            spread: 70,
                            origin: { y: 0.6 }
                        });
                    }
                    alert('Reward redeemed successfully!');
                    currentUser.points = (parseInt(currentUser.points) || 0) - points;
                    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                    document.getElementById('reward-points-display').textContent = currentUser.points;
                    document.getElementById('reward-points-display-main').textContent = currentUser.points;
                    loadRewardsList(currentUser.points);
                    loadRedeemedHistory();
                    // Refresh charts
                    const data = await api.getData();
                    window.disposals = data.disposals.filter(d => d.user_id == currentUser.id);
                    if (window.disposals.length > 0) {
                        loadRewardsTimeChart(window.disposals, document.getElementById('chart-period').value);
                        loadRewardsPieChart(window.disposals);
                        loadDetailedAnalysisChart(window.disposals, window.bins);
                    }
                } else {
                    alert(result.error || 'Failed to redeem reward.');
                }
                document.getElementById('redeem-modal').classList.add('hidden');
            };

            document.getElementById('confirm-redeem').onclick = confirmRedeem;
            document.getElementById('cancel-redeem').onclick = () => {
                document.getElementById('redeem-modal').classList.add('hidden');
            };
        });
    });
}

async function loadRedeemedHistory() {
    const data = await api.getData();
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const history = data.rewards.filter(r => r.user_id == currentUser.id);
    const historyTable = document.getElementById('redeemed-history');
    const noHistoryMsg = document.getElementById('no-history-msg');
    if (history.length === 0) {
        noHistoryMsg.classList.remove('hidden');
        historyTable.innerHTML = '';
    } else {
        noHistoryMsg.classList.add('hidden');
        historyTable.innerHTML = history.map(h => `
            <tr class="hover:bg-green-50">
                <td class="py-2 px-4 border-b">${h.name}</td>
                <td class="py-2 px-4 border-b">${h.points}</td>
                <td class="py-2 px-4 border-b">${new Date(h.created_at).toLocaleString()}</td>
            </tr>
        `).join('');
    }
}