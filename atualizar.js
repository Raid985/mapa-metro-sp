const fs = require('fs');

const esperar = ms => new Promise(r => setTimeout(r, ms));

async function atualizarDados() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY nao configurada.');

  const dadosAtuais = fs.readFileSync('dados.json', 'utf8');
  const hoje = new Date().toISOString().slice(0, 10);

  const host = 'generativelanguage' + '.googleapis.com';
  const base = 'https://' + host + '/v1beta/';

  const prompt = 'Voce e um especialista em transporte ferroviario de Sao Paulo. Com base nas informacoes mais recentes das obras e operacoes das linhas do Metro, CPTM, ViaQuatro, ViaMobilidade, Linha Uni, Trivia Trens, TIC Trens e Trens Intercidades (TIC) de Sao Paulo ate ' + hoje + ', atualize o JSON abaixo movendo estacoes inauguradas para "op", estacoes com obras iniciadas para "build", atualizando porcentagens ("buildPct", "projectPct"), notas ("note") e mudando "DATA_ATUALIZACAO" para "' + hoje + '". Mantenha EXATAMENTE a mesma estrutura e chaves do JSON original. Responda APENAS com o JSON valido, sem crases markdown ou explicacoes.\n\nJSON ATUAL:\n' + dadosAtuais;

  const modelos = ['models/gemini-flash-latest', 'models/gemini-flash-lite-latest'];
  let textoResposta = null;

  for (let tentativa = 1; tentativa <= 4; tentativa++) {
    const modeloAtual = modelos.at((tentativa - 1) % modelos.length);
    console.log('Tentativa ' + tentativa + ' usando ' + modeloAtual + '...');

    const response = await fetch(base + modeloAtual + ':generateContent?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (response.ok) {
      const data = await response.json();
      const candidato = data.candidates.at(0);
      const parte = candidato.content.parts.at(0);
      textoResposta = parte.text.replace(/```json/g, '').replace(/```/g, '').trim();
      break;
    }

    const erroTexto = await response.text();
    console.warn('Falha na tentativa ' + tentativa + ' (' + response.status + '): ' + erroTexto.slice(0, 150));

    if (tentativa < 4) {
      console.log('Aguardando 15 segundos antes de tentar novamente...');
      await esperar(15000);
    } else {
      throw new Error('Todas as tentativas falharam. Ultimo erro: ' + response.status + ' ' + erroTexto);
    }
  }

  const jsonValidado = JSON.parse(textoResposta);
  fs.writeFileSync('dados.json', JSON.stringify(jsonValidado, null, 2), 'utf8');
  console.log('dados.json atualizado com sucesso para', hoje);
}

atualizarDados().catch(err => {
  console.error(err);
  process.exit(1);
});
