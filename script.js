const cartIdInput = document.getElementById('cartId');
const loadBtn = document.getElementById('loadBtn');
const statusEl = document.getElementById('status');
const cartDataEl = document.getElementById('cartData');
const errorEl = document.getElementById('error');
const modeSelect = document.getElementById('mode');

const MAX_ATTEMPTS = 2;
const RETRY_DELAY = 1000;

function getUrl(id) {
    const mode = modeSelect.value;
    if (mode === '404') return 'https://dummyjson.com/http/404/Not_Found';
    if (mode === '503') return 'https://dummyjson.com/http/503/Service_Unavailable';
    return `https://dummyjson.com/carts/${id}?delay=3000`;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getErrorMessage(error) {
    if (error.status === 404) return 'ресурс не знайдено (404)';
    if (error.status === 503) return 'сервіс тимчасово недоступний (503)';
    if (error.status) return `сервер повернув статус ${error.status}`;
    if (error.name === 'TypeError') return 'не вдалося з\'єднатися з сервером';
    return error.message;
}

async function fetchCart(id, attempt) {
    if (modeSelect.value === 'failFirst' && attempt === 1) {
        throw new Error('штучна помилка клієнта (тестовий режим)');
    }

    const response = await fetch(getUrl(id));

    if (!response.ok) {
        const err = new Error(`HTTP ${response.status}`);
        err.status = response.status;
        throw err;
    }

    return await response.json();
}

async function requestWithRetry(id) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        statusEl.textContent = `Завантаження кошика… Спроба ${attempt} із ${MAX_ATTEMPTS}`;

        try {
            const data = await fetchCart(id, attempt);
            return { data, attempt };
        } catch (error) {
            if (attempt === MAX_ATTEMPTS) {
                throw error;
            }
            errorEl.textContent = `Спроба ${attempt} невдала: ${getErrorMessage(error)}. Повторна спроба через 1 с…`;
            await sleep(RETRY_DELAY);
            errorEl.textContent = '';
        }
    }
}

async function loadCart(id) {
    errorEl.textContent = '';
    cartDataEl.innerHTML = '';
    loadBtn.disabled = true;

    try {
        const { data, attempt } = await requestWithRetry(id);
        renderCart(data);
        statusEl.textContent = `Кошик успішно завантажено (спроба ${attempt} із ${MAX_ATTEMPTS})`;
    } catch (error) {
        statusEl.textContent = '';
        errorEl.textContent = `Помилка запиту: ${getErrorMessage(error)}. Усі спроби (${MAX_ATTEMPTS}) вичерпано, повторіть запит кнопкою.`;
        console.error(error);
    } finally {
        loadBtn.disabled = false;
    }
}

function addRow(table, values) {
    const row = document.createElement('tr');
    values.forEach(value => {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
    });
    table.appendChild(row);
}

function renderCart(cart) {
    cartDataEl.innerHTML = '';

    const title = document.createElement('h2');
    title.textContent = `Кошик № ${cart.id}`;
    cartDataEl.appendChild(title);

    const table = document.createElement('table');
    table.border = '1';
    table.cellPadding = '6';
    addRow(table, ['Товар', 'Ціна ($)', 'Кількість', 'Вартість ($)']);

    cart.products.forEach(product => {
        addRow(table, [product.title, product.price, product.quantity, product.total]);
    });
    cartDataEl.appendChild(table);

    const sum = document.createElement('p');
    sum.textContent = `Загальна сума кошика: ${cart.total} $ (зі знижкою: ${cart.discountedTotal} $)`;
    cartDataEl.appendChild(sum);
}

loadBtn.addEventListener('click', () => {
    loadCart(cartIdInput.value);
});