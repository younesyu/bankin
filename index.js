const axios = require('axios');

// Credentials
const url = 'http://localhost:3000'
const login = 'BankinUser'
const password = '12345678'
const clientId = 'BankinClientId'
const clientSecret = 'secret'

function sendLoginRequest() {
    let headers = {
        "Content-Type": "application/json",
    }

    return axios.post(url + '/login', {
        "user": login,
        "password": password,
    }, {
        headers: headers,
        auth: {
            username: clientId,
            password: clientSecret
        }
    });
}

function fetchRefreshToken() {
    return sendLoginRequest().then(response => {
        let data = response.data;
        let refreshToken = data.refresh_token;

        return refreshToken;
    });
}

function fetchAccessToken(refreshToken) {
    let headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }

    let body = `grant_type=refresh_token&refresh_token=${refreshToken}`;

    return axios.post(url + '/token', body, {
        headers: headers
    }).then(response => response.data.access_token);
}

function fetchAccounts(accessToken, link) {
    link = link || `/accounts?page=1`;

    let headers = {
        "Content-Type": "application/json",
        'Authorization': `Bearer ${accessToken}`
    }

    return axios.get(url + link, {
        headers: headers
    });
}

function fetchTransactions(accessToken, accNumber, link) {
    link = link || `/accounts/${accNumber}/transactions?page=1`;

    let headers = {
        "Content-Type": "application/json",
        'Authorization': `Bearer ${accessToken}`
    }

    return axios.get(url + `/accounts/${accNumber}/transactions`, {
        headers: headers
    });
}

async function main() {
    let accounts = [];
    let parsedAccounts = []
    let nextAccountLink;
    let nextTransactionLink;

    // Récupération du refresh token
    let refreshToken = await fetchRefreshToken();

    // Récupération des données des comptes
    do {
        await fetchAccessToken(refreshToken)
            .then(accessToken => fetchAccounts(accessToken, nextAccountLink))
            .then(response => {
                for (let account of response.data.account) {
                    accounts.push(account);
                }
                nextAccountLink = response.data.link.next;
            }).catch(console.log);
    } while (nextAccountLink);

    // Pour chaque compte, récupérer les transactions associées
    for (let account of accounts) {
        nextTransactionLink = null;
        let transactions = [];
        do {
            await fetchAccessToken(refreshToken)
                .then(accessToken => fetchTransactions(accessToken, account.acc_number, nextTransactionLink))
                .then(r => {
                    let data = r.data;
                    data.transactions.forEach(t => transactions.push(t));
                    nextTransactionLink = (data.link.next == nextTransactionLink) ? null : data.link.next
                })
                .catch(e => console.log());
        } while (nextTransactionLink);

        // Parser les informations selon le format demandé
        let parsed = {
            "acc_number": account.acc_number,
            // Sommer les montants des transactions associée au compte courant
            "amount": transactions.map(t => parseInt(t.amount)).reduce((a, b) => a + b, 0).toString(),
            "transactions": transactions.map(transaction => (({ label, amount, currency }) => ({ label, amount, currency }))(transaction))
        };
        parsedAccounts.push(parsed);
    }

    console.log(JSON.stringify(parsedAccounts, null, 4));
}

main();