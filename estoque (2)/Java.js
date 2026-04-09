// ==========================================
// 1. INICIALIZAÇÃO GERAL E SINCRONIZAÇÃO
// ==========================================
const DB_KEY = "finance_user_data";
const defaultFinanceData = {
    nome: "Admin Pizzaria",
    idade: 30,
    cpf: "123.456.789-00",
    saldo: 0.00,
    pedidos: 0,
    estoque: 2000, 
    pass: "123",
    user: "admin"
};

document.addEventListener("DOMContentLoaded", () => {
    if(!localStorage.getItem(DB_KEY)) {
        localStorage.setItem(DB_KEY, JSON.stringify(defaultFinanceData));
    }

    const menuLateral = document.getElementById("menuLateral");
    const btnAbrir = document.getElementById("btnAbrir");
    const btnFechar = document.getElementById("btnFechar");
    const btnTema = document.getElementById("btnTema");
    const iconeSol = document.getElementById("iconeSol");
    const iconeLua = document.getElementById("iconeLua");

    if(btnAbrir) btnAbrir.addEventListener("click", () => menuLateral.style.width = "260px");
    if(btnFechar) btnFechar.addEventListener("click", () => menuLateral.style.width = "0");

    if(btnTema) {
        btnTema.addEventListener("click", function() {
            document.body.classList.toggle("tema-claro");
            if (document.body.classList.contains("tema-claro")) {
                iconeSol.style.display = "none";
                iconeLua.style.display = "inline";
            } else {
                iconeSol.style.display = "inline";
                iconeLua.style.display = "none";
            }
        });
    }

    if (document.getElementById('userName')) updateUI(); 
    if (document.getElementById('tabelaPedidos')) renderizarTabela(); 
});

window.addEventListener('storage', function(event) {
    if (event.key === DB_KEY && document.getElementById('userName')) updateUI();
    if (event.key === DB_KEY && document.getElementById('tabelaPedidos')) renderizarTabela();
    if (event.key === 'pedidosPizzaria' && document.getElementById('tabelaPedidos')) {
        pedidosSalvos = JSON.parse(localStorage.getItem('pedidosPizzaria')) || [];
        renderizarTabela();
    }
});

// ==========================================
// 2. SISTEMA DE LOGIN E PERFIL
// ==========================================
function getDB() {
    const data = localStorage.getItem(DB_KEY);
    return data ? JSON.parse(data) : defaultFinanceData;
}

const usuariosPermitidos = [
    { user: "admin", pass: "123", nome: "Administrador" },
    { user: "ronan", pass: "123456", nome: "Ronan" },
    { user: "juliana", pass: "12345", nome: "Juliana" }
];

function login() {
    const userIn = document.getElementById('user')?.value.toLowerCase();
    const passIn = document.getElementById('pass')?.value;
    const usuarioLogado = usuariosPermitidos.find(u => u.user === userIn && u.pass === passIn);

    if(usuarioLogado) {
        document.getElementById('login-screen').classList.add('login-anim-out');
        localStorage.setItem("usuarioAtivo", usuarioLogado.nome);
        setTimeout(() => {
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('profile-screen').classList.remove('hidden');
            if (document.getElementById('userName')) updateUI();
            if (document.getElementById('tabelaPedidos')) renderizarTabela();
        }, 400);
    } else {
        const err = document.getElementById('login-error');
        if(err) err.innerText = "Usuário ou senha incorretos!";
    }
}

function logout() { 
    localStorage.removeItem("usuarioAtivo"); 
    location.reload(); 
}

function updateUI() {
    const db = getDB();
    const elName = document.getElementById('userName');
    if(!elName) return; 

    const nomeAtual = localStorage.getItem("usuarioAtivo") || "Visitante";
    elName.innerText = nomeAtual;
    document.getElementById('userCpf').innerText = "CPF: " + db.cpf;
    document.getElementById('userIdade').innerText = db.idade;
    document.getElementById('userOrders').innerText = db.pedidos;
    document.getElementById('userBalance').innerText = db.saldo.toLocaleString('pt-br', {style: 'currency', currency: 'BRL'});
    
    // Atualiza o estoque visual na página de perfil
    const estoqueVisual = document.getElementById('estoqueAtual');
    if(estoqueVisual) estoqueVisual.innerHTML = `${db.estoque} <small style="font-size: 0.8rem">itens</small>`;
}

function openModal() {
    const db = getDB();
    const nomeAtual = localStorage.getItem("usuarioAtivo") || db.nome;

    document.getElementById('editNome').value = nomeAtual;
    document.getElementById('editIdade').value = db.idade;
    document.getElementById('editSaldo').value = db.saldo;
    document.getElementById('editOrders').value = db.pedidos;
    
    const editEstoque = document.getElementById('editEstoque');
    if(editEstoque) editEstoque.value = db.estoque;

    document.getElementById('editModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
}

function saveData() {
    const db = getDB();
    const novoNome = document.getElementById('editNome').value;
    
    db.nome = novoNome;
    db.idade = document.getElementById('editIdade').value;
    db.saldo = parseFloat(document.getElementById('editSaldo').value);
    db.pedidos = document.getElementById('editOrders').value;
    
    const editEstoque = document.getElementById('editEstoque');
    if(editEstoque) db.estoque = parseInt(editEstoque.value);
    
    localStorage.setItem("usuarioAtivo", novoNome);
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    
    updateUI();
    closeModal();
    alert("Perfil e Estoque atualizados com sucesso!");
}

// ==========================================
// 3. SISTEMA DE PEDIDOS E ESTOQUE
// ==========================================
let pedidosSalvos = JSON.parse(localStorage.getItem('pedidosPizzaria')) || [];
let idEdicaoAtual = null;

function renderizarTabela() {
    const tbody = document.getElementById('tabelaPedidos');
    if (!tbody) return;

    tbody.innerHTML = ''; 
    const pedidosReversos = [...pedidosSalvos].reverse();

    pedidosReversos.forEach((pedido) => {
        const novaLinha = document.createElement('tr');
        let badgeStatus = '';
        if(pedido.status === 'Fila') badgeStatus = '<span class="badge status-picking">Fila / Espera</span>';
        if(pedido.status === 'Entregue') badgeStatus = '<span class="badge status-done">Entregue</span>';

        novaLinha.innerHTML = `
            <td>${pedido.id}</td>
            <td>${pedido.canal}<br><span class="integration-tag" style="background:var(--primary);color:white">${pedido.tag}</span><br><b>${pedido.nome}</b></td>
            <td><div class="resumo-pedido">${pedido.resumoTexto}<br>End: ${pedido.end}</div></td>
            <td>${badgeStatus}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-confirm" onclick="mudarStatus('${pedido.id}', 'Entregue')">Entregue</button>
                    <button class="btn-wait" onclick="mudarStatus('${pedido.id}', 'Fila')">Fila</button>
                    <button class="btn-edit" onclick="abrirModalPedido('${pedido.id}')">Editar</button>
                    <button class="btn-danger" style="background: var(--danger); color: white;" onclick="excluirPedido('${pedido.id}')">Excluir</button>
                </div>
            </td>
        `;
        tbody.appendChild(novaLinha);
    });

    const contador = document.getElementById('contadorPedidos');
    if (contador) contador.innerText = pedidosSalvos.length;

    const db = getDB();
    const estoqueAtual = document.getElementById('estoqueAtual');
    if (estoqueAtual) {
        estoqueAtual.innerHTML = `${db.estoque} <small style="font-size: 0.8rem">itens</small>`;
    }
}

function abrirModalPedido(id = null) {
    const modal = document.getElementById('modalPedido');
    const title = document.getElementById('modalTitle');
    
    if (id) {
        title.innerText = "Editar Pedido";
        idEdicaoAtual = id;
        const pedido = pedidosSalvos.find(p => p.id === id);
        
        document.getElementById('p_nome').value = pedido.nome;
        document.getElementById('p_end').value = pedido.end;
        document.getElementById('p_pagamento').value = pedido.pag;
        document.getElementById('p_sabor').value = pedido.sabor;
        document.getElementById('p_tamanho').value = pedido.tamBruto;
        document.getElementById('p_bebida').value = pedido.bebBruta;
    } else {
        title.innerText = "Novo Pedido Manual";
        idEdicaoAtual = null;
        limparFormularioPedido();
    }
    modal.classList.add('active');
}

function fecharModalPedido() {
    document.getElementById('modalPedido').classList.remove('active');
    limparFormularioPedido();
}

function limparFormularioPedido() {
    document.getElementById('p_nome').value = '';
    document.getElementById('p_end').value = '';
    document.getElementById('p_pagamento').value = '';
    document.getElementById('p_sabor').value = '';
    document.getElementById('p_tamanho').value = '';
    document.getElementById('p_bebida').value = 'Nenhuma|0';
}

function salvarPedido() {
    const nome = document.getElementById('p_nome').value;
    const end = document.getElementById('p_end').value;
    const pag = document.getElementById('p_pagamento').value;
    const sabor = document.getElementById('p_sabor').value;
    const tamanhoBruto = document.getElementById('p_tamanho').value;
    const bebidaBruta = document.getElementById('p_bebida').value;

    if (!nome || !end || !pag || !sabor || !tamanhoBruto) {
        alert("Por favor, preencha os campos essenciais.");
        return;
    }

    const [tamNome, tamValor] = tamanhoBruto.split('|');
    const [bebNome, bebValor] = bebidaBruta.split('|');
    const total = parseFloat(tamValor) + parseFloat(bebValor);
    
    const resumo = `Pizza ${sabor} (${tamNome}) <br> ${bebNome !== 'Nenhuma' ? '+ ' + bebNome + '<br>' : ''} <b>Total: R$ ${total.toFixed(2)}</b> <br> <small>Pagamento: ${pag}</small>`;
    const atendente = localStorage.getItem("usuarioAtivo") || "Balcão";

    let financeDb = getDB();

    if (idEdicaoAtual) {
        const index = pedidosSalvos.findIndex(p => p.id === idEdicaoAtual);
        const pedidoAntigo = pedidosSalvos[index];
        
        // Pega os valores antigos para ver se tem que dar/tirar mais dinheiro e estoque
        const [oldTamNome, oldTamValor] = pedidoAntigo.tamBruto.split('|');
        const [oldBebNome, oldBebValor] = pedidoAntigo.bebBruta.split('|');
        const oldTotal = parseFloat(oldTamValor) + parseFloat(oldBebValor);
        
        let oldItensConsumidos = 1;
        if(oldBebNome !== 'Nenhuma') oldItensConsumidos += 1;

        let novosItensConsumidos = 1;
        if(bebNome !== 'Nenhuma') novosItensConsumidos += 1;

        // Calcula a diferença e atualiza o banco
        financeDb.saldo = parseFloat(financeDb.saldo) + (total - oldTotal);
        financeDb.estoque = parseInt(financeDb.estoque) - (novosItensConsumidos - oldItensConsumidos);
        localStorage.setItem(DB_KEY, JSON.stringify(financeDb));

        pedidosSalvos[index] = {
            ...pedidosSalvos[index],
            nome: nome, end: end, pag: pag, sabor: sabor,
            tamBruto: tamanhoBruto, bebBruta: bebidaBruta,
            resumoTexto: resumo, tag: "Editado"
        };
    } else {
        const novoPedido = {
            id: "#" + Math.floor(Math.random() * 9000 + 1000),
            canal: atendente,
            tag: "Novo", status: "Fila",
            nome: nome, end: end, pag: pag, sabor: sabor,
            tamBruto: tamanhoBruto, bebBruta: bebidaBruta,
            resumoTexto: resumo
        };
        pedidosSalvos.push(novoPedido);

        let itensConsumidos = 1; 
        if(bebNome !== 'Nenhuma') itensConsumidos += 1;

        financeDb.saldo = parseFloat(financeDb.saldo) + total;
        financeDb.pedidos = parseInt(financeDb.pedidos) + 1;
        financeDb.estoque = parseInt(financeDb.estoque) - itensConsumidos; 
        localStorage.setItem(DB_KEY, JSON.stringify(financeDb));
    }

    localStorage.setItem('pedidosPizzaria', JSON.stringify(pedidosSalvos));
    renderizarTabela();
    if (document.getElementById('userName')) updateUI(); // Atualiza painel caso esteja no perfil
    fecharModalPedido();
}

function mudarStatus(id, novoStatus) {
    const index = pedidosSalvos.findIndex(p => p.id === id);
    if(index !== -1) {
        pedidosSalvos[index].status = novoStatus;
        localStorage.setItem('pedidosPizzaria', JSON.stringify(pedidosSalvos));
        renderizarTabela();
    }
}

// Excluir Pedido e Repor o Estoque/Caixa
function excluirPedido(id) {
    if (confirm("Tem a certeza que deseja excluir este pedido? O valor será descontado do caixa e os itens repostos no stock.")) {
        const index = pedidosSalvos.findIndex(p => p.id === id);
        if (index !== -1) {
            const pedidoAExcluir = pedidosSalvos[index];
            
            const [tamNome, tamValor] = pedidoAExcluir.tamBruto.split('|');
            const [bebNome, bebValor] = pedidoAExcluir.bebBruta.split('|');
            const total = parseFloat(tamValor) + parseFloat(bebValor);
            
            let itensARepor = 1; 
            if(bebNome !== 'Nenhuma') itensARepor += 1;

            let financeDb = getDB();
            financeDb.saldo = parseFloat(financeDb.saldo) - total;
            financeDb.pedidos = parseInt(financeDb.pedidos) - 1;
            financeDb.estoque = parseInt(financeDb.estoque) + itensARepor; 
            localStorage.setItem(DB_KEY, JSON.stringify(financeDb));

            pedidosSalvos.splice(index, 1);
            localStorage.setItem('pedidosPizzaria', JSON.stringify(pedidosSalvos));
            
            renderizarTabela();
            if (document.getElementById('userName')) updateUI();
        }
    }
}