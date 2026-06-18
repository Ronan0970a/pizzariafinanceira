// ==========================================
// 1. LIGAÇÃO AO SUPABASE
// ==========================================
// ATENÇÃO: Substitua pelas suas credenciais reais do Supabase (Project Settings > API)
const supabaseUrl = 'https://vnerobezclyvtmverjxs.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuZXJvYmV6Y2x5dnRtdmVyanhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMzQ0MjQsImV4cCI6MjA5NjYxMDQyNH0.Rhurtp-B-qXWeCV8vWeAp3m-YR-fKFkco2y2EZpMUXU'; 
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

let idEdicaoAtual = null;

// ==========================================
// 2. INICIALIZAÇÃO GERAL E UI
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    // 2.1 Configurações do Menu e Tema
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

    // 2.2 Verificar Segurança e Carregar Dados
    const sessaoAtiva = await verificarSessao();
    
    // Se o utilizador tiver sessão iniciada, carrega os dados das páginas onde estiver
    if (sessaoAtiva) {
        if (document.getElementById('userName')) await carregarPerfilNuvem(); 
        if (document.getElementById('tabelaPedidos')) await renderizarTabelaPedidos();
        if (document.getElementById('tabelaEstoque')) {
            await renderizarTabelaEstoque();
            await atualizarEstoqueGlobalNuvem();
        }
    }
});

// ==========================================
// 3. SISTEMA DE LOGIN SEGURO (SUPABASE AUTH)
// ==========================================
async function verificarSessao() {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Se não houver sessão e estivermos numa página que não seja o login, pode redirecionar no futuro
    return session !== null;
}

async function login() {
    const emailIn = document.getElementById('user')?.value.toLowerCase();
    const passIn = document.getElementById('pass')?.value;

    if (!emailIn || !passIn) {
        document.getElementById('login-error').innerText = "Preencha o email e a palavra-passe!";
        return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email: emailIn,
        password: passIn
    });

    if (error) {
        const err = document.getElementById('login-error');
        if(err) err.innerText = "Email ou palavra-passe incorretos!";
        console.error("Erro de segurança:", error.message);
    } else {
        document.getElementById('login-screen').classList.add('login-anim-out');
        localStorage.setItem("usuarioAtivo", data.user.email); 
        
        setTimeout(async () => {
            document.getElementById('login-screen').classList.add('hidden');
            const profileScreen = document.getElementById('profile-screen');
            if(profileScreen) profileScreen.classList.remove('hidden');
            
            if (document.getElementById('userName')) await carregarPerfilNuvem(); 
            if (document.getElementById('tabelaPedidos')) await renderizarTabelaPedidos();
        }, 400);
    }
}

async function logout() { 
    await supabase.auth.signOut();
    localStorage.removeItem("usuarioAtivo"); 
    location.reload(); 
}

// ==========================================
// 4. PERFIL E FINANÇAS (VIA SUPABASE)
// ==========================================
async function carregarPerfilNuvem() {
    const { data, error } = await supabase.from('perfil_financeiro').select('*').eq('id', 1).single();
    
    if (error) {
        console.error("Erro ao carregar perfil:", error);
        return;
    }

    const elName = document.getElementById('userName');
    if(elName) elName.innerText = data.nome;

    if(document.getElementById('userCpf')) document.getElementById('userCpf').innerText = "CPF: " + data.cpf;
    if(document.getElementById('userIdade')) document.getElementById('userIdade').innerText = data.idade;
    if(document.getElementById('userOrders')) document.getElementById('userOrders').innerText = data.pedidos_total;
    if(document.getElementById('userBalance')) document.getElementById('userBalance').innerText = data.saldo.toLocaleString('pt-br', {style: 'currency', currency: 'BRL'});
    
    const estoqueVisual = document.getElementById('estoqueAtual');
    if(estoqueVisual) estoqueVisual.innerHTML = `${data.estoque_total} <small style="font-size: 0.8rem">itens</small>`;
}

async function openModal() {
    const { data } = await supabase.from('perfil_financeiro').select('*').eq('id', 1).single();
    if(!data) return;

    document.getElementById('editNome').value = data.nome;
    document.getElementById('editIdade').value = data.idade;
    document.getElementById('editSaldo').value = data.saldo;
    document.getElementById('editOrders').value = data.pedidos_total;
    
    const editEstoque = document.getElementById('editEstoque');
    if(editEstoque) editEstoque.value = data.estoque_total;

    document.getElementById('editModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
}

async function saveData() {
    const novoNome = document.getElementById('editNome').value;
    const novaIdade = parseInt(document.getElementById('editIdade').value);
    const novoSaldo = parseFloat(document.getElementById('editSaldo').value);
    const novosPedidos = parseInt(document.getElementById('editOrders').value);
    
    let novoEstoque = null;
    const editEstoque = document.getElementById('editEstoque');
    if(editEstoque) novoEstoque = parseInt(editEstoque.value);

    const atualizacoes = {
        nome: novoNome,
        idade: novaIdade,
        saldo: novoSaldo,
        pedidos_total: novosPedidos
    };

    if (novoEstoque !== null) atualizacoes.estoque_total = novoEstoque;

    const { error } = await supabase.from('perfil_financeiro').update(atualizacoes).eq('id', 1);

    if(!error) {
        await carregarPerfilNuvem();
        closeModal();
        alert("Perfil atualizado com sucesso na nuvem!");
    } else {
        alert("Erro ao atualizar o perfil.");
        console.error(error);
    }
}

// ==========================================
// 5. SISTEMA DE PEDIDOS (VIA SUPABASE)
// ==========================================
async function renderizarTabelaPedidos() {
    const tbody = document.getElementById('tabelaPedidos');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">A carregar pedidos da nuvem... ⏳</td></tr>';

    const { data: pedidos, error } = await supabase.from('pedidos').select('*').order('criado_em', { ascending: false });
    tbody.innerHTML = ''; 

    if (error || !pedidos || pedidos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhum pedido encontrado.</td></tr>';
        return;
    }

    pedidos.forEach((pedido) => {
        const novaLinha = document.createElement('tr');
        let badgeStatus = '';
        if(pedido.status === 'Fila') badgeStatus = '<span class="badge status-picking">Fila / Espera</span>';
        if(pedido.status === 'Entregue') badgeStatus = '<span class="badge status-done">Entregue</span>';

        novaLinha.innerHTML = `
            <td>${pedido.codigo_pedido}</td>
            <td>${pedido.canal}<br><span class="integration-tag" style="background:var(--primary);color:white">${pedido.tag}</span><br><b>${pedido.nome_cliente}</b></td>
            <td><div class="resumo-pedido">${pedido.resumo_texto}<br>End: ${pedido.endereco}</div></td>
            <td>${badgeStatus}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-confirm" onclick="mudarStatus(${pedido.id}, 'Entregue')">Entregue</button>
                    <button class="btn-wait" onclick="mudarStatus(${pedido.id}, 'Fila')">Fila</button>
                    <button class="btn-edit" onclick="abrirModalPedido(${pedido.id})">Editar</button>
                    <button class="btn-danger" style="background: var(--danger); color: white;" onclick="excluirPedido(${pedido.id}, '${pedido.tam_bruto}', '${pedido.beb_bruta}')">Excluir</button>
                </div>
            </td>
        `;
        tbody.appendChild(novaLinha);
    });

    const contador = document.getElementById('contadorPedidos');
    if (contador) contador.innerText = pedidos.length;
}

async function abrirModalPedido(id = null) {
    const modal = document.getElementById('modalPedido');
    const title = document.getElementById('modalTitle');
    
    if (id) {
        title.innerText = "Editar Pedido";
        idEdicaoAtual = id;
        const { data: pedido } = await supabase.from('pedidos').select('*').eq('id', id).single();
        
        if(pedido) {
            document.getElementById('p_nome').value = pedido.nome_cliente;
            document.getElementById('p_end').value = pedido.endereco;
            document.getElementById('p_pagamento').value = pedido.pagamento;
            document.getElementById('p_sabor').value = pedido.sabor;
            document.getElementById('p_tamanho').value = pedido.tam_bruto;
            document.getElementById('p_bebida').value = pedido.beb_bruta;
        }
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

async function salvarPedido() {
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

    // Vai buscar os dados atuais de finanças para atualizar
    const { data: financeDb } = await supabase.from('perfil_financeiro').select('*').eq('id', 1).single();

    if (idEdicaoAtual) {
        // Modo Edição
        const { data: pedidoAntigo } = await supabase.from('pedidos').select('*').eq('id', idEdicaoAtual).single();
        const [oldTamNome, oldTamValor] = pedidoAntigo.tam_bruto.split('|');
        const [oldBebNome, oldBebValor] = pedidoAntigo.beb_bruta.split('|');
        const oldTotal = parseFloat(oldTamValor) + parseFloat(oldBebValor);
        
        let oldItensConsumidos = 1; if(oldBebNome !== 'Nenhuma') oldItensConsumidos += 1;
        let novosItensConsumidos = 1; if(bebNome !== 'Nenhuma') novosItensConsumidos += 1;

        const novoSaldo = parseFloat(financeDb.saldo) + (total - oldTotal);
        const novoEstoque = parseInt(financeDb.estoque_total) - (novosItensConsumidos - oldItensConsumidos);

        await supabase.from('perfil_financeiro').update({ saldo: novoSaldo, estoque_total: novoEstoque }).eq('id', 1);

        await supabase.from('pedidos').update({
            nome_cliente: nome, endereco: end, pagamento: pag, sabor: sabor,
            tam_bruto: tamanhoBruto, beb_bruta: bebidaBruta, resumo_texto: resumo, tag: "Editado"
        }).eq('id', idEdicaoAtual);

    } else {
        // Novo Pedido
        const codigoGerado = "#" + Math.floor(Math.random() * 9000 + 1000);
        let itensConsumidos = 1; if(bebNome !== 'Nenhuma') itensConsumidos += 1;

        const novoSaldo = parseFloat(financeDb.saldo) + total;
        const novoTotalPedidos = parseInt(financeDb.pedidos_total) + 1;
        const novoEstoque = parseInt(financeDb.estoque_total) - itensConsumidos; 

        await supabase.from('perfil_financeiro').update({ 
            saldo: novoSaldo, pedidos_total: novoTotalPedidos, estoque_total: novoEstoque 
        }).eq('id', 1);

        await supabase.from('pedidos').insert([{
            codigo_pedido: codigoGerado, canal: atendente, tag: "Novo", status: "Fila",
            nome_cliente: nome, endereco: end, pagamento: pag, sabor: sabor,
            tam_bruto: tamanhoBruto, beb_bruta: bebidaBruta, resumo_texto: resumo
        }]);
    }

    await renderizarTabelaPedidos();
    if (document.getElementById('userName')) await carregarPerfilNuvem(); 
    fecharModalPedido();
}

async function mudarStatus(id, novoStatus) {
    await supabase.from('pedidos').update({ status: novoStatus }).eq('id', id);
    await renderizarTabelaPedidos();
}

async function excluirPedido(id, tamBruto, bebBruta) {
    if (confirm("Tem a certeza que deseja excluir este pedido? O valor será descontado do caixa e os itens repostos no stock.")) {
        
        const [tamNome, tamValor] = tamBruto.split('|');
        const [bebNome, bebValor] = bebBruta.split('|');
        const total = parseFloat(tamValor) + parseFloat(bebValor);
        
        let itensARepor = 1; 
        if(bebNome !== 'Nenhuma') itensARepor += 1;

        const { data: financeDb } = await supabase.from('perfil_financeiro').select('*').eq('id', 1).single();
        
        const novoSaldo = parseFloat(financeDb.saldo) - total;
        const novosPedidos = parseInt(financeDb.pedidos_total) - 1;
        const novoEstoque = parseInt(financeDb.estoque_total) + itensARepor; 

        await supabase.from('perfil_financeiro').update({ 
            saldo: novoSaldo, pedidos_total: novosPedidos, estoque_total: novoEstoque 
        }).eq('id', 1);

        await supabase.from('pedidos').delete().eq('id', id);
        
        await renderizarTabelaPedidos();
        if (document.getElementById('userName')) await carregarPerfilNuvem();
    }
}

// ==========================================
// 6. CONTROLE DE ESTOQUE DETALHADO (VIA SUPABASE)
// ==========================================
async function getListaEstoqueNuvem() {
    const { data, error } = await supabase.from('estoque_itens').select('*').order('nome', { ascending: true });
    if (error) console.error("Erro ao buscar estoque:", error);
    return data || [];
}

async function atualizarEstoqueGlobalNuvem() {
    const lista = await getListaEstoqueNuvem();
    const totalItens = lista.reduce((acc, item) => acc + item.quantidade, 0);
    
    await supabase.from('perfil_financeiro').update({ estoque_total: totalItens }).eq('id', 1);
    
    const displayEstoque = document.getElementById('estoqueAtual');
    if (displayEstoque) displayEstoque.innerHTML = `${totalItens} <small style="font-size: 0.8rem">itens</small>`;
}

async function adicionarItemEstoque() {
    const nome = document.getElementById('itemNome').value.trim();
    const qtd = parseInt(document.getElementById('itemQtd').value);

    if(!nome || isNaN(qtd) || qtd <= 0) {
        alert("Preencha um nome e uma quantidade válida maior que zero.");
        return;
    }

    const { data: itemExistente } = await supabase.from('estoque_itens').select('*').ilike('nome', nome).single();

    if (itemExistente) {
        const novaQtd = itemExistente.quantidade + qtd;
        await supabase.from('estoque_itens').update({ quantidade: novaQtd }).eq('id', itemExistente.id);
    } else {
        await supabase.from('estoque_itens').insert([{ nome: nome, quantidade: qtd }]);
    }

    document.getElementById('itemNome').value = '';
    document.getElementById('itemQtd').value = '';
    
    await renderizarTabelaEstoque();
    await atualizarEstoqueGlobalNuvem();
}

async function removerQuantidadeItem(id, qtdAtual, qtdRemover) {
    const novaQtd = qtdAtual - qtdRemover;

    if (novaQtd <= 0) {
        await supabase.from('estoque_itens').delete().eq('id', id);
    } else {
        await supabase.from('estoque_itens').update({ quantidade: novaQtd }).eq('id', id);
    }

    await renderizarTabelaEstoque();
    await atualizarEstoqueGlobalNuvem();
}

async function renderizarTabelaEstoque(termoBusca = "") {
    const tbody = document.getElementById('tabelaEstoque');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan=\"3\" style=\"text-align:center;\">A carregar dados da nuvem... ⏳</td></tr>';

    let query = supabase.from('estoque_itens').select('*').order('nome', { ascending: true });
    
    if (termoBusca !== "") {
        query = query.ilike('nome', `%${termoBusca}%`); 
    }

    const { data: listaFiltrada, error } = await query;

    tbody.innerHTML = '';

    if(error || !listaFiltrada || listaFiltrada.length === 0) {
        if (termoBusca !== "") {
            tbody.innerHTML = `<tr><td colspan=\"3\" style=\"text-align:center;\">Nenhum item encontrado para \"${termoBusca}\".</td></tr>`;
        } else {
            tbody.innerHTML = '<tr><td colspan=\"3\" style=\"text-align:center;\">Estoque vazio. Adicione itens acima.</td></tr>';
        }
        return;
    }

    listaFiltrada.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.nome}</td>
            <td style=\"color: var(--primary); font-weight: bold;\">${item.quantidade} un</td>
            <td>
                <div class=\"action-buttons\">
                    <button onclick=\"removerQuantidadeItem(${item.id}, ${item.quantidade}, 1)\" style=\"background: var(--warning); padding: 5px 10px;\">-1</button>
                    <button onclick=\"removerQuantidadeItem(${item.id}, ${item.quantidade}, ${item.quantidade})\" style=\"background: var(--danger); padding: 5px 10px;\">Excluir Tudo</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filtrarEstoque() {
    const termo = document.getElementById('buscaEstoque').value.trim();
    renderizarTabelaEstoque(termo);
}
