import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const userId = '7ff3c15f-6c30-44ab-85ab-941273c4e1c4';

const clientsToInsert = [
  {
    user_id: userId,
    company_name: 'Kumon Morumbi Luiz Migliano',
    niche: 'Cursos de matemática, português e inglês para crianças a partir de 3 anos de idade, adultos e idosos.',
    description: 'Minha jornada com o Kumon começou muito antes de me tornar orientadora. Entre 2006 e 2007, tive a oportunidade de ser aluna dos cursos de inglês e japonês. Em janeiro de 2019, iniciei meu trabalho na unidade como auxiliar. E em agosto de 2023, assumi oficialmente como orientadora da unidade. Tenho formação em Magistério, Secretariado e Kidscoaching, somada à minha experiência de mais de 10 anos na área de RH. Ofereço os cursos de português, matemática, inglês e alfabetização.',
    opening_date: '01/08/2023, data que eu assumi como orientadora. A unidade já existe a mais de 10 anos.',
    phone: '(11) 3895-5290 / (11) 99447-8030',
    website: 'www.kumon.com.br/sp/morumbi-luiz-migliano/',
    delivery_cities: 'Temos atendimento online para os nossos alunos.',
    operating_hours: 'De segunda a sexta das 9h às 18h. Quarta-feira das 9h às 16h.',
    has_restroom: 'Sim',
    has_accessibility: 'Não',
    has_wheelchair_restroom: 'Não',
    is_active: true
  },
  {
    user_id: userId,
    company_name: 'Dynamic Suspensões',
    niche: 'Rodas pneus suspensões automotivo',
    description: 'Há mais de 25 anos no mercado automotivo, somos referência em suspensão original, esportiva e reforma de rodas em Campinas (SP) e região. Reforma de rodas, molas esportivas, rodas, pneus, suspensão ar, amortecedores, manutenção em suspensão.',
    opening_date: '01/12/2000',
    phone: '19993294439',
    website: 'Dynamicsuspensões.com.br',
    delivery_cities: 'Não',
    operating_hours: '8:30 a 18:00',
    has_restroom: 'Sim',
    has_accessibility: 'Sim',
    has_wheelchair_restroom: 'Não',
    is_active: true
  },
  {
    user_id: userId,
    company_name: 'Kumon Contagem - Eldorado',
    niche: 'Educação',
    description: 'Conheci o Kumon através de minha filha, que foi aluna de Matemática e Português. Eu também fiz inglês logo em seguida, me identifiquei muito com o método. Gostei muito do método pois sempre gostei a área de Educação. Formei em Engenharia Elétrica, trabalhei 25 anos na área e em 2019, estava desempregada, surgiu esta oportunidade de assumir a unidade.',
    opening_date: '07/2019',
    phone: '31 984061450',
    website: 'www.kumon.com.br/mg/contagem-eldorado',
    delivery_cities: 'Sim, Contagem / MG e tenho um aluno nos EUA',
    operating_hours: 'Seg/quart e quinta : 7 às 17:30 e terças e sextas : 7 às 20:00',
    has_restroom: 'Sim',
    has_accessibility: 'Sim',
    has_wheelchair_restroom: 'Sim',
    is_active: true
  },
  {
    user_id: userId,
    company_name: 'Kumon Jardim Botânico - Maria Angélica',
    niche: 'Educação, inglês, matemática e português',
    description: 'Sou formada em administração de empresas pela PUC-RJ, pós graduada em marketing de serviço - Coppead, atuei no mercado corporativo por 25 anos os 15 finais como executiva no mercado de telecomunicações. Após um período de 1 ano sabático, resolvi abrir meu próprio negócio e me apaixonei pelo método kumon, que é muito bem estruturado, e proporciona aos alunos diferenciais de altas capacidades como autodidatismo, visão crítica e alto desempenho acadêmico e profissional. Aqui no Kumon Jardim Botânico atuamos com as disciplinas de inglês , matemática e português.',
    opening_date: '20/02/2018',
    phone: '219880101336',
    website: 'Www.kumon.com.br',
    delivery_cities: 'Sim temos atendimento on line nacional e internacional',
    operating_hours: '9h às 18:00',
    has_restroom: 'Sim',
    has_accessibility: 'Não',
    has_wheelchair_restroom: 'Não',
    is_active: true
  }
];

async function run() {
  for (const client of clientsToInsert) {
    const { data, error } = await supabase.from('clients').insert(client).select();
    if (error) {
      console.error('Error inserting', client.company_name, error);
    } else {
      console.log('Inserted', client.company_name);
    }
  }
}
run();
