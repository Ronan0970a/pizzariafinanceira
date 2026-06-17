// ==========================================
// 1. LIGAÇÃO AO SUPABASE
// ==========================================
const supabaseUrl = 'SUA_URL_AQUI'; // EX: https://abcdefghijklm.supabase.co
const supabaseKey = 'SUA_CHAVE_ANONIMA_AQUI'; // A chave longa "anon public"
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// ==========================================
// 2. INICIALIZAÇÃO GERAL E UI
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    // Configurações do Menu e Tema
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

    // Carregar dados da Nuvem ao entrar na página
    if (document.getElementById('userName')) await carregarPerfilNuvem(); 
    if (document.getElementById('tabelaEstoque')) {
        await renderizarTabelaEstoque();
        await atualizarEstoqueGlobalNuvem();
    }
});

// ==========================================
// 3. PERFIL E FINANÇAS (VIA SUPABASE)
// ==========================================
async function carregarPerfilNuvem() {
    // Vai buscar a linha de id 1 na tabela perfil_financeiro
    const { data, error } = await supabase.from('perfil_financeiro').select('*').eq('id', 1).single();
    
    if (error) {
        console.error("Erro ao carregar perfil:", error);
        return;
    }

    if (document.getElementById('userName')) document.getElementById('userName').innerText = data.nome;
    if (document.getElementById('userCpf')) document.getElementById('userCpf').innerText = "CPF: " + data.cpf;
    if (document.getElementById('userIdade')) document.getElementById('userIdade').innerText = data.idade;
    if (document.getElementById('userOrders')) document.getElementById('userOrders').innerText = data.pedidos_total;
    if (document.getElementById('userBalance')) document.getElementById('userBalance').innerText = data.saldo.toLocaleString('pt-br', {style: 'currency', currency: 'BRL'});
    
    const estoqueVisual = document.getElementById('estoqueAtual');
    if(estoqueVisual) estoqueVisual.innerHTML = `${data.estoque_total} <small style="font-size: 0.8rem">itens</small>`;
}

// ==========================================
// 4. CONTROLE DE ESTOQUE DETALHADO (VIA SUPABASE)
// ==========================================

// Puxa a lista de itens diretamente do banco de dados na nuvem
async function getListaEstoqueNuvem() {
    const { data, error } = await supabase.from('estoque_itens').select('*').order('nome', { ascending: true });
    if (error) console.error("Erro ao buscar estoque:", error);
    return data || [];
}

// Atualiza o saldo global de itens na tabela de perfil
async function atualizarEstoqueGlobalNuvem() {
    const lista = await getListaEstoqueNuvem();
    const totalItens = lista.reduce((acc, item) => acc + item.quantidade, 0);
    
    // Atualiza o total na nuvem
    await supabase.from('perfil_financeiro').update({ estoque_total: totalItens }).eq('id', 1);
    
    // Atualiza visualmente
    const displayEstoque = document.getElementById('estoqueAtual');
    if (displayEstoque) {
        displayEstoque.innerHTML = `${totalItens} <small style="font-size: 0.8rem">itens</small>`;
    }
}

// Função para adicionar Item (Agora fala com a Nuvem)
async function adicionarItemEstoque() {
    const nome = document.getElementById('itemNome').value.trim();
    const qtd = parseInt(document.getElementById('itemQtd').value);

    if(!nome || isNaN(qtd) || qtd <= 0) {
        alert("Preencha um nome e uma quantidade válida maior que zero.");
        return;
    }

    // Verifica se o item já existe na nuvem
    const { data: itemExistente } = await supabase.from('estoque_itens').select('*').ilike('nome', nome).single();

    if (itemExistente) {
        // Se existe, soma a quantidade
        const novaQtd = itemExistente.quantidade + qtd;
        await supabase.from('estoque_itens').update({ quantidade: novaQtd }).eq('id', itemExistente.id);
    } else {
        // Se não existe, insere um novo
        await supabase.from('estoque_itens').insert([{ nome: nome, quantidade: qtd }]);
    }

    // Limpa campos e atualiza ecrã
    document.getElementById('itemNome').value = '';
    document.getElementById('itemQtd').value = '';
    
    await renderizarTabelaEstoque();
    await atualizarEstoqueGlobalNuvem();
}

// Remove quantidade ou exclui o item na nuvem
async function removerQuantidadeItem(id, qtdAtual, qtdRemover) {
    const novaQtd = qtdAtual - qtdRemover;

    if (novaQtd <= 0) {
        // Apaga do banco de dados
        await supabase.from('estoque_itens').delete().eq('id', id);
    } else {
        // Atualiza a nova quantidade
        await supabase.from('estoque_itens').update({ quantidade: novaQtd }).eq('id', id);
    }

    await renderizarTabelaEstoque();
    await atualizarEstoqueGlobalNuvem();
}

// Desenha a tabela procurando na base de dados
async function renderizarTabelaEstoque(termoBusca = "") {
    const tbody = document.getElementById('tabelaEstoque');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">A carregar dados da nuvem... ⏳</td></tr>';

    let query = supabase.from('estoque_itens').select('*').order('nome', { ascending: true });
    
    if (termoBusca !== "") {
        query = query.ilike('nome', `%${termoBusca}%`); // Busca semelhante na nuvem
    }

    const { data: listaFiltrada, error } = await query;

    tbody.innerHTML = '';

    if(error || !listaFiltrada || listaFiltrada.length === 0) {
        if (termoBusca !== "") {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Nenhum item encontrado para "${termoBusca}".</td></tr>`;
        } else {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Estoque vazio. Adicione itens acima.</td></tr>';
        }
        return;
    }

    listaFiltrada.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.nome}</td>
            <td style="color: var(--primary); font-weight: bold;">${item.quantidade} un</td>
            <td>
                <div class="action-buttons">
                    <button onclick="removerQuantidadeItem(${item.id}, ${item.quantidade}, 1)" style="background: var(--warning); padding: 5px 10px;">-1</button>
                    <button onclick="removerQuantidadeItem(${item.id}, ${item.quantidade}, ${item.quantidade})" style="background: var(--danger); padding: 5px 10px;">Excluir Tudo</button>
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