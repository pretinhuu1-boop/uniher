#!/usr/bin/env python3
"""UniHER – Proposta Comercial R$5.000 com copy de conversão em venda.
Custos operacionais + valor do produto + experiência + roadmap de upgrades."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)
import os

# ═══════════════════ COLORS ═══════════════════
CREAM_50  = HexColor("#F7F3EE")
ROSE_500  = HexColor("#C85C7E")
ROSE_400  = HexColor("#E8849E")
ROSE_300  = HexColor("#EAB8CB")
ROSE_700  = HexColor("#8C3255")
ROSE_50   = HexColor("#F9EEF3")
GOLD_700  = HexColor("#B8922A")
GOLD_500  = HexColor("#D4B060")
GOLD_50   = HexColor("#FAF5E8")
GREEN_600 = HexColor("#3E7D5A")
GREEN_50  = HexColor("#EAF5EE")
TEXT_900  = HexColor("#2A1A1F")
TEXT_600  = HexColor("#6B4D57")
TEXT_400  = HexColor("#A48090")
BORDER    = HexColor("#E5D5DC")
BG_WHITE  = HexColor("#FFFFFF")
BLUE_500  = HexColor("#4A7DC9")
BLUE_50   = HexColor("#EDF2FA")

W, H = A4

# ═══════════════════ STYLES ═══════════════════
S = {
    'cover_title': ParagraphStyle('ct', fontName='Times-Bold', fontSize=44, leading=50, textColor=white, alignment=TA_LEFT),
    'cover_sub': ParagraphStyle('cs', fontName='Helvetica', fontSize=13, leading=19, textColor=ROSE_300, alignment=TA_LEFT),
    'cover_tag': ParagraphStyle('ctag', fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=GOLD_500, alignment=TA_LEFT),
    'sn': ParagraphStyle('sn', fontName='Helvetica', fontSize=11, leading=14, textColor=ROSE_400),
    'st': ParagraphStyle('st', fontName='Times-Bold', fontSize=22, leading=28, textColor=TEXT_900, spaceBefore=4, spaceAfter=8),
    'h2': ParagraphStyle('h2', fontName='Times-Bold', fontSize=15, leading=20, textColor=ROSE_700, spaceBefore=10, spaceAfter=5),
    'h3': ParagraphStyle('h3', fontName='Helvetica-Bold', fontSize=11, leading=15, textColor=TEXT_900, spaceBefore=8, spaceAfter=3),
    'body': ParagraphStyle('body', fontName='Helvetica', fontSize=9.5, leading=14.5, textColor=TEXT_600, alignment=TA_JUSTIFY, spaceBefore=2, spaceAfter=2),
    'bb': ParagraphStyle('bb', fontName='Helvetica-Bold', fontSize=9.5, leading=14.5, textColor=TEXT_900, spaceBefore=2, spaceAfter=2),
    'bullet': ParagraphStyle('bul', fontName='Helvetica', fontSize=9.5, leading=14, textColor=TEXT_600, leftIndent=14, bulletIndent=4, spaceBefore=1, spaceAfter=1),
    'small': ParagraphStyle('sm', fontName='Helvetica', fontSize=7.5, leading=10, textColor=TEXT_400, spaceBefore=2),
    'th': ParagraphStyle('th', fontName='Helvetica-Bold', fontSize=8.5, leading=12, textColor=white, alignment=TA_CENTER),
    'th_l': ParagraphStyle('thl', fontName='Helvetica-Bold', fontSize=8.5, leading=12, textColor=white),
    'td': ParagraphStyle('td', fontName='Helvetica', fontSize=8.5, leading=12, textColor=TEXT_900, alignment=TA_CENTER),
    'td_l': ParagraphStyle('tdl', fontName='Helvetica', fontSize=8.5, leading=12, textColor=TEXT_900),
    'td_b': ParagraphStyle('tdb', fontName='Helvetica-Bold', fontSize=8.5, leading=12, textColor=TEXT_900, alignment=TA_CENTER),
    'td_r': ParagraphStyle('tdr', fontName='Helvetica', fontSize=8.5, leading=12, textColor=TEXT_900, alignment=TA_RIGHT),
    'td_rb': ParagraphStyle('tdrb', fontName='Helvetica-Bold', fontSize=8.5, leading=12, textColor=TEXT_900, alignment=TA_RIGHT),
    'hero': ParagraphStyle('ph', fontName='Times-Bold', fontSize=54, leading=60, textColor=ROSE_500, alignment=TA_CENTER),
    'hero_sub': ParagraphStyle('ps', fontName='Helvetica', fontSize=12, leading=16, textColor=TEXT_600, alignment=TA_CENTER),
    'quote': ParagraphStyle('q', fontName='Times-Italic', fontSize=11, leading=16, textColor=ROSE_700, leftIndent=16, rightIndent=16, spaceBefore=8, spaceAfter=8, alignment=TA_CENTER),
    'cta': ParagraphStyle('cta', fontName='Helvetica-Bold', fontSize=13, leading=18, textColor=white, alignment=TA_CENTER),
    'check': ParagraphStyle('ck', fontName='Helvetica', fontSize=9, leading=13, textColor=GREEN_600),
    'sale_copy': ParagraphStyle('sc', fontName='Helvetica', fontSize=10, leading=16, textColor=TEXT_900, alignment=TA_JUSTIFY, spaceBefore=3, spaceAfter=3),
    'sale_bold': ParagraphStyle('sb', fontName='Helvetica-Bold', fontSize=10, leading=16, textColor=ROSE_700, spaceBefore=3, spaceAfter=3),
    'urgency': ParagraphStyle('urg', fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=HexColor("#D94F4F"), alignment=TA_CENTER),
}

# ═══════════════════ HELPERS ═══════════════════
def mc(val, label, color=ROSE_500):
    v = Paragraph(val, ParagraphStyle('_v', fontName='Times-Bold', fontSize=20, leading=24, textColor=color, alignment=TA_CENTER))
    l = Paragraph(label, ParagraphStyle('_l', fontName='Helvetica', fontSize=7.5, leading=10, textColor=TEXT_600, alignment=TA_CENTER))
    t = Table([[v],[l]], colWidths=[40*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),BG_WHITE),('BOX',(0,0),(-1,-1),0.5,BORDER),
        ('ROUNDEDCORNERS',[8,8,8,8]),('TOPPADDING',(0,0),(0,0),10),
        ('BOTTOMPADDING',(-1,-1),(-1,-1),8),('ALIGN',(0,0),(-1,-1),'CENTER'),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ]))
    return t

def bx(text, bg=ROSE_50, fg=ROSE_700, w=170*mm):
    p = Paragraph(text, ParagraphStyle('_bx', fontName='Helvetica-Bold', fontSize=9.5, leading=14, textColor=fg, alignment=TA_CENTER))
    t = Table([[p]], colWidths=[w])
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),bg),('ROUNDEDCORNERS',[8,8,8,8]),
        ('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),10),
        ('LEFTPADDING',(0,0),(-1,-1),14),('RIGHTPADDING',(0,0),(-1,-1),14),
    ]))
    return t

def sec(num, title, story):
    story.append(Paragraph(num, S['sn']))
    story.append(Paragraph(title, S['st']))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ROSE_300, spaceAfter=6))

def tbl(headers, rows, widths, hl_last=False):
    h = [Paragraph(hd, S['th_l'] if i==0 else S['th']) for i,hd in enumerate(headers)]
    data = [h]+rows
    t = Table(data, colWidths=widths)
    cmds = [
        ('BACKGROUND',(0,0),(-1,0),ROSE_500),('GRID',(0,0),(-1,-1),0.5,BORDER),
        ('ROUNDEDCORNERS',[6,6,6,6]),('TOPPADDING',(0,0),(-1,-1),6),
        ('BOTTOMPADDING',(0,0),(-1,-1),6),('LEFTPADDING',(0,0),(-1,-1),6),
        ('RIGHTPADDING',(0,0),(-1,-1),6),('VALIGN',(0,0),(-1,-1),'MIDDLE'),
        ('ROWBACKGROUNDS',(0,1),(-1,-2 if hl_last else -1),[BG_WHITE,CREAM_50]),
    ]
    if hl_last:
        cmds.append(('BACKGROUND',(0,-1),(-1,-1),GOLD_50))
    t.setStyle(TableStyle(cmds))
    return t

def cta_box(text):
    p = Paragraph(text, S['cta'])
    t = Table([[p]], colWidths=[170*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),ROSE_500),('ROUNDEDCORNERS',[10,10,10,10]),
        ('TOPPADDING',(0,0),(-1,-1),16),('BOTTOMPADDING',(0,0),(-1,-1),16),
        ('LEFTPADDING',(0,0),(-1,-1),18),('RIGHTPADDING',(0,0),(-1,-1),18),
    ]))
    return t

# ═══════════════════ PAGE BG ═══════════════════
def cover_bg(c, doc):
    c.saveState()
    c.setFillColor(ROSE_700)
    c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(ROSE_500)
    c.circle(W-20,H-40,180,fill=1,stroke=0)
    c.setFillColor(HexColor("#A0405F"))
    c.circle(-50,60,140,fill=1,stroke=0)
    c.setFillColor(GOLD_500)
    c.circle(W-80,180,6,fill=1,stroke=0)
    c.circle(140,H-90,4,fill=1,stroke=0)
    c.restoreState()

def page_bg(c, doc):
    c.saveState()
    c.setFillColor(CREAM_50)
    c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(ROSE_500)
    c.rect(0,H-3,W,3,fill=1,stroke=0)
    c.setFillColor(GOLD_500)
    c.rect(0,H-4.5,W,1.5,fill=1,stroke=0)
    c.setFont('Helvetica',7)
    c.setFillColor(TEXT_400)
    c.drawString(20*mm,12,"UniHER  |  Proposta Comercial  |  Confidencial  |  Marco 2026")
    c.drawRightString(W-20*mm,12,f"Pagina {doc.page}")
    c.setFont('Times-Bold',8)
    c.setFillColor(ROSE_300)
    c.drawRightString(W-20*mm,H-14,"UniHER")
    c.restoreState()

# ═══════════════════ BUILD ═══════════════════
def build_pdf():
    out = os.path.join(os.path.dirname(__file__), "UniHER_Proposta_5K_2026.pdf")
    doc = SimpleDocTemplate(out, pagesize=A4, topMargin=22*mm, bottomMargin=18*mm, leftMargin=20*mm, rightMargin=20*mm)
    story = []

    # ══════ CAPA ══════
    story.append(Spacer(1,50*mm))
    story.append(Paragraph("UniHER", S['cover_title']))
    story.append(Spacer(1,3*mm))
    story.append(Paragraph("Proposta Comercial", ParagraphStyle('_s', fontName='Times-Bold', fontSize=22, leading=28, textColor=white)))
    story.append(Spacer(1,6*mm))
    story.append(Paragraph(
        "Plataforma completa de saude feminina corporativa.<br/>"
        "Codigo-fonte, design, documentacao, deploy e roadmap de evolucao com IA.",
        S['cover_sub']))
    story.append(Spacer(1,3*mm))
    story.append(Paragraph("CONFIDENCIAL  |  MARCO 2026  |  VALIDADE: 30 DIAS", S['cover_tag']))
    story.append(Spacer(1,28*mm))

    cm = [[mc("20.037","Linhas de\nCodigo",TEXT_900), mc("101","Arquivos\nFonte",ROSE_500),
           mc("16","Paginas\nFuncionais",GOLD_700), mc("R$5K","Investimento\nTotal",GREEN_600)]]
    t=Table(cm,colWidths=[42*mm]*4)
    t.setStyle(TableStyle([('ALIGN',(0,0),(-1,-1),'CENTER'),('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
    story.append(t)
    story.append(PageBreak())

    # ══════ P2: CUSTOS OPERACIONAIS COMPLETOS ══════
    sec("01","Custos Operacionais Completos", story)

    story.append(Paragraph(
        "Antes de falar de valor, vamos aos fatos. Abaixo esta cada centavo necessario para "
        "criar, manter e evoluir a UniHER. Transparencia total:",
        S['sale_copy']))
    story.append(Spacer(1,3*mm))

    story.append(Paragraph("1.1 Custo de Criacao (unico)", S['h2']))

    c1_h = ["Item","Detalhamento","Custo (R$)"]
    c1_r = [
        [Paragraph("Assinatura Claude (IA)", S['td_l']),
         Paragraph("Plano Max 1 mes (acesso Opus\npara geracao de codigo)", S['td_l']),
         Paragraph("<b>R$ 1.020</b>", S['td_rb'])],
        [Paragraph("Tokens excedentes", S['td_l']),
         Paragraph("~8M tokens (input+output)\nalem do plano", S['td_l']),
         Paragraph("<b>R$ 450</b>", S['td_rb'])],
        [Paragraph("Energia eletrica", S['td_l']),
         Paragraph("~40h MacBook (0.065 kW)\nR$0.92/kWh tarifa SP", S['td_l']),
         Paragraph("<b>R$ 2.40</b>", S['td_rb'])],
        [Paragraph("Internet", S['td_l']),
         Paragraph("~3GB dados (proporcional\nao plano mensal)", S['td_l']),
         Paragraph("<b>R$ 8.00</b>", S['td_rb'])],
        [Paragraph("Ferramentas (VS Code, Git,\nnpm, Python, Vercel CLI)", S['td_l']),
         Paragraph("Todas gratuitas / open source", S['td_l']),
         Paragraph("<b>R$ 0</b>", S['td_rb'])],
        [Paragraph("Pesquisa de mercado\n(web search agents)", S['td_l']),
         Paragraph("12 concorrentes analisados,\ndados de 8 fontes", S['td_l']),
         Paragraph("<b>R$ 0</b>\n(incluso tokens)", S['td_rb'])],
        [Paragraph("Geracao de PDFs\n(4 documentos)", S['td_l']),
         Paragraph("ReportLab (gratis), dados\nde mercado coletados por IA", S['td_l']),
         Paragraph("<b>R$ 0</b>\n(incluso tokens)", S['td_rb'])],
        [Paragraph("<b>SUBTOTAL CRIACAO</b>", ParagraphStyle('_sb', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=TEXT_900)),
         Paragraph("", S['td']),
         Paragraph("<b>R$ 1.480,40</b>", S['td_rb'])],
    ]
    story.append(tbl(c1_h, c1_r, [40*mm, 52*mm, 30*mm], hl_last=True))
    story.append(Spacer(1,4*mm))

    story.append(Paragraph("1.2 Custo Mensal de Operacao", S['h2']))

    c2_h = ["Servico","Plano Atual","Custo/Mes","Custo/Ano"]
    c2_r = [
        [Paragraph("Vercel (hosting)", S['td_l']),
         Paragraph("Hobby (gratis)", S['td']),
         Paragraph("<b>R$ 0</b>", S['td_b']),
         Paragraph("R$ 0", S['td'])],
        [Paragraph("Dominio .com.br", S['td_l']),
         Paragraph("Registro.br", S['td']),
         Paragraph("<b>R$ 3,33</b>", S['td_b']),
         Paragraph("R$ 40", S['td'])],
        [Paragraph("SSL / CDN / Analytics", S['td_l']),
         Paragraph("Incluso Vercel", S['td']),
         Paragraph("<b>R$ 0</b>", S['td_b']),
         Paragraph("R$ 0", S['td'])],
        [Paragraph("Monitoramento (uptime)", S['td_l']),
         Paragraph("UptimeRobot free", S['td']),
         Paragraph("<b>R$ 0</b>", S['td_b']),
         Paragraph("R$ 0", S['td'])],
        [Paragraph("<b>TOTAL MENSAL</b>", ParagraphStyle('_tm', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=TEXT_900)),
         Paragraph("", S['td']),
         Paragraph("<b>R$ 3,33</b>", S['td_b']),
         Paragraph("<b>R$ 40</b>", S['td_b'])],
    ]
    story.append(tbl(c2_h, c2_r, [38*mm, 32*mm, 26*mm, 24*mm], hl_last=True))
    story.append(Spacer(1,4*mm))

    story.append(Paragraph("1.3 Custo de Evolucao (upgrades com agentes IA)", S['h2']))

    c3_h = ["Upgrade","Agente IA Necessario","Custo Est."]
    c3_r = [
        [Paragraph("Backend real (Firebase/Supabase)", S['td_l']),
         Paragraph("Claude Opus - ~2M tokens\n+ Firebase Spark (gratis)", S['td_l']),
         Paragraph("<b>R$ 350</b>", S['td_rb'])],
        [Paragraph("Autenticacao real (email+senha)", S['td_l']),
         Paragraph("Claude Opus - ~500K tokens\n+ Firebase Auth (gratis)", S['td_l']),
         Paragraph("<b>R$ 120</b>", S['td_rb'])],
        [Paragraph("Dashboard com dados reais", S['td_l']),
         Paragraph("Claude Opus - ~1M tokens\n(integracao com banco)", S['td_l']),
         Paragraph("<b>R$ 200</b>", S['td_rb'])],
        [Paragraph("App mobile (React Native)", S['td_l']),
         Paragraph("Claude Opus - ~4M tokens\n(novo projeto baseado no web)", S['td_l']),
         Paragraph("<b>R$ 800</b>", S['td_rb'])],
        [Paragraph("Integracoes (SAP, TOTVS, Gupy)", S['td_l']),
         Paragraph("Claude Opus - ~1.5M tokens\n+ APIs de terceiros", S['td_l']),
         Paragraph("<b>R$ 300</b>", S['td_rb'])],
        [Paragraph("IA interna (chatbot de saude)", S['td_l']),
         Paragraph("Claude API - SDK + fine-tuning\ncontexto de saude feminina", S['td_l']),
         Paragraph("<b>R$ 500</b>", S['td_rb'])],
    ]
    story.append(tbl(c3_h, c3_r, [46*mm, 50*mm, 26*mm]))
    story.append(Spacer(1,3*mm))
    story.append(Paragraph(
        "Cada upgrade e feito com agentes de IA (Claude) a uma fracao do custo de uma equipe de dev. "
        "Um backend que custaria R$30.000-50.000 com devs, custa R$350 com agentes IA.",
        S['small']))
    story.append(Spacer(1,3*mm))

    story.append(bx(
        "CUSTO TOTAL DE PRODUCAO + 1 ANO NO AR: <b>R$ 1.520</b><br/>"
        "Com todos os upgrades listados: <b>R$ 3.790</b>",
        GOLD_50, GOLD_700))
    story.append(PageBreak())

    # ══════ P3: VALOR DO PRODUTO ══════
    sec("02","O Valor Real do Que Voce Esta Comprando", story)

    story.append(Paragraph(
        "Voce nao esta comprando linhas de codigo. Voce esta comprando uma <b>posicao de mercado</b>, "
        "um <b>produto validado</b> e um <b>atalho de 6 meses</b> para comecar a faturar em um mercado "
        "que ninguem no Brasil esta atendendo.",
        S['sale_copy']))
    story.append(Spacer(1,4*mm))

    story.append(Paragraph("Valor do Produto", S['h2']))

    vp_h = ["O Que Voce Recebe","Valor de Mercado","Voce Paga"]
    vp_r = [
        [Paragraph("<b>Landing page profissional</b>\n8 secoes, responsiva, SEO, quiz\ninterativo, animacoes", S['td_l']),
         Paragraph("R$ 8.000\na R$ 15.000", S['td']),
         Paragraph("Incluso", S['td'])],
        [Paragraph("<b>3 dashboards completos</b>\nRH (6 modulos), Lideranca (5),\nColaboradora (5) com graficos", S['td_l']),
         Paragraph("R$ 60.000\na R$ 110.000", S['td']),
         Paragraph("Incluso", S['td'])],
        [Paragraph("<b>Sistema de gamificacao</b>\nBadges, desafios, streaks, niveis,\ncheck-in, conquistas", S['td_l']),
         Paragraph("R$ 15.000\na R$ 25.000", S['td']),
         Paragraph("Incluso", S['td'])],
        [Paragraph("<b>Design system premium</b>\nPaleta cream/rose/gold, 40 CSS,\nidentidade visual completa", S['td_l']),
         Paragraph("R$ 10.000\na R$ 20.000", S['td']),
         Paragraph("Incluso", S['td'])],
        [Paragraph("<b>Auth role-based + fluxos</b>\nWelcome, onboarding, login,\n3 perfis com nav diferente", S['td_l']),
         Paragraph("R$ 8.000\na R$ 15.000", S['td']),
         Paragraph("Incluso", S['td'])],
        [Paragraph("<b>4 documentos de mercado</b>\nSWOT, precificacao, proposta,\nanalise de 12 concorrentes", S['td_l']),
         Paragraph("R$ 8.000\na R$ 15.000", S['td']),
         Paragraph("Incluso", S['td'])],
        [Paragraph("<b>Deploy ativo + SEO</b>\nVercel, robots.ts, sitemap.ts,\npronto para apresentar", S['td_l']),
         Paragraph("R$ 3.000\na R$ 5.000", S['td']),
         Paragraph("Incluso", S['td'])],
        [Paragraph("<b>VALOR TOTAL</b>", ParagraphStyle('_vt', fontName='Helvetica-Bold', fontSize=10, leading=13, textColor=TEXT_900)),
         Paragraph("<b>R$ 112.000\na R$ 205.000</b>", S['td_b']),
         Paragraph("<b>R$ 5.000</b>", ParagraphStyle('_5k', fontName='Helvetica-Bold', fontSize=11, leading=14, textColor=ROSE_500, alignment=TA_CENTER))],
    ]
    story.append(tbl(vp_h, vp_r, [52*mm, 30*mm, 22*mm], hl_last=True))
    story.append(Spacer(1,3*mm))
    story.append(Paragraph(
        "Valores de referencia: contratacao de freelancers Next.js/React senior no Brasil "
        "(R$150-300/h), designers UX senior (R$120-250/h), consultores de mercado (R$200-400/h). "
        "Fontes: GeekHunter, Revelo, Glassdoor, 99freelas (2024-2025).",
        S['small']))
    story.append(PageBreak())

    # ══════ P4: EXPERIENCIA E DIFERENCIAL ══════
    sec("03","A Experiencia Que Voce Esta Adquirindo", story)

    story.append(Paragraph(
        "A UniHER nao e um template generico. E um <b>produto pensado, pesquisado e construido</b> "
        "para resolver um problema real de um mercado de R$ 13 bilhoes. Cada decisao de design, "
        "cada funcionalidade e cada tela foi criada com intencao estrategica:",
        S['sale_copy']))
    story.append(Spacer(1,3*mm))

    exp_items = [
        ("<b>Experiencia de uso premium:</b>", "Interface cream/rose/gold que transmite sofisticacao "
         "e acolhimento. Nao e um dashboard corporativo frio - e uma plataforma que mulheres querem usar. "
         "Animacoes suaves, tipografia elegante (serif para titulos, sans para corpo), micro-interacoes "
         "em cada clique."),
        ("<b>Jornada completa do usuario:</b>", "Da landing page ao onboarding, do login ao dashboard "
         "personalizado por perfil. Nao faltam telas. O investidor ou cliente ve um produto completo, "
         "nao um prototipo."),
        ("<b>Gamificacao que engaja:</b>", "Badges, streaks, desafios com barra de progresso, check-in "
         "diario, niveis. Cada interacao da uma sensacao de progresso. Isso nao e decoracao - "
         "e a mecanica que mantem colaboradoras voltando todo dia."),
        ("<b>Dados que vendem:</b>", "Os dashboards de RH e Lideranca mostram ROI, engajamento, "
         "semaforo de saude, historico. Quando um diretor de RH ve esses graficos, ele nao esta "
         "vendo mockup - ele esta vendo o retorno do investimento."),
        ("<b>Compliance como porta de entrada:</b>", "A Lei 14.611 obriga 50.000+ empresas a reportar "
         "equidade de genero. A UniHER nao e um 'nice to have' - e uma ferramenta que ajuda a empresa "
         "a nao levar multa de 3% da folha de pagamento."),
    ]
    for title, desc in exp_items:
        story.append(Paragraph(f"\u2022  {title} {desc}", S['bullet']))
        story.append(Spacer(1,2*mm))

    story.append(Spacer(1,3*mm))
    story.append(Paragraph(
        "\"Voce nao vende software. Voce vende a solucao para um problema que 50.000 empresas "
        "tem e ninguem esta resolvendo. Esse e o valor real.\"",
        S['quote']))
    story.append(PageBreak())

    # ══════ P5: ROADMAP DE UPGRADES ══════
    sec("04","Roadmap de Evolucao com Agentes IA", story)

    story.append(Paragraph(
        "Um dos maiores diferenciais dessa compra: <b>o produto pode ser evoluido continuamente "
        "usando agentes de IA por uma fracao do custo tradicional</b>. Abaixo, o roadmap de upgrades "
        "planejados e o custo de cada um:",
        S['sale_copy']))
    story.append(Spacer(1,3*mm))

    # Phase 1
    story.append(Paragraph("Fase 1 - Ativacao (Semana 1-4)", S['h2']))
    p1_h = ["Upgrade","Custo IA","Custo Equipe\nTradicional","Economia"]
    p1_r = [
        [Paragraph("Backend Firebase (banco + auth real)", S['td_l']),
         Paragraph("<b>R$ 350</b>", S['td_b']),
         Paragraph("R$ 35.000", S['td']),
         Paragraph("<b>99%</b>", S['td_b'])],
        [Paragraph("Emails transacionais (Resend)", S['td_l']),
         Paragraph("<b>R$ 120</b>", S['td_b']),
         Paragraph("R$ 8.000", S['td']),
         Paragraph("<b>98.5%</b>", S['td_b'])],
        [Paragraph("Dados reais nos dashboards", S['td_l']),
         Paragraph("<b>R$ 200</b>", S['td_b']),
         Paragraph("R$ 20.000", S['td']),
         Paragraph("<b>99%</b>", S['td_b'])],
    ]
    story.append(tbl(p1_h, p1_r, [48*mm, 24*mm, 30*mm, 22*mm]))
    story.append(Spacer(1,3*mm))

    # Phase 2
    story.append(Paragraph("Fase 2 - Expansao (Mes 2-3)", S['h2']))
    p2_r = [
        [Paragraph("App mobile React Native", S['td_l']),
         Paragraph("<b>R$ 800</b>", S['td_b']),
         Paragraph("R$ 80.000", S['td']),
         Paragraph("<b>99%</b>", S['td_b'])],
        [Paragraph("Chatbot IA de saude feminina", S['td_l']),
         Paragraph("<b>R$ 500</b>", S['td_b']),
         Paragraph("R$ 45.000", S['td']),
         Paragraph("<b>98.9%</b>", S['td_b'])],
        [Paragraph("Relatorios PDF automaticos", S['td_l']),
         Paragraph("<b>R$ 150</b>", S['td_b']),
         Paragraph("R$ 12.000", S['td']),
         Paragraph("<b>98.7%</b>", S['td_b'])],
    ]
    story.append(tbl(p1_h, p2_r, [48*mm, 24*mm, 30*mm, 22*mm]))
    story.append(Spacer(1,3*mm))

    # Phase 3
    story.append(Paragraph("Fase 3 - Escala (Mes 4-6)", S['h2']))
    p3_r = [
        [Paragraph("Integracoes (SAP, TOTVS, Gupy)", S['td_l']),
         Paragraph("<b>R$ 300</b>", S['td_b']),
         Paragraph("R$ 40.000", S['td']),
         Paragraph("<b>99.2%</b>", S['td_b'])],
        [Paragraph("Multi-tenancy (SaaS real)", S['td_l']),
         Paragraph("<b>R$ 400</b>", S['td_b']),
         Paragraph("R$ 50.000", S['td']),
         Paragraph("<b>99.2%</b>", S['td_b'])],
        [Paragraph("Payment gateway (Stripe/Asaas)", S['td_l']),
         Paragraph("<b>R$ 250</b>", S['td_b']),
         Paragraph("R$ 25.000", S['td']),
         Paragraph("<b>99%</b>", S['td_b'])],
    ]
    story.append(tbl(p1_h, p3_r, [48*mm, 24*mm, 30*mm, 22*mm]))
    story.append(Spacer(1,4*mm))

    story.append(bx(
        "CUSTO TOTAL DE TODOS OS UPGRADES COM IA: <b>R$ 3.070</b><br/>"
        "CUSTO EQUIVALENTE COM EQUIPE TRADICIONAL: <b>R$ 315.000</b><br/>"
        "ECONOMIA TOTAL: <b>99%</b>",
        GREEN_50, GREEN_600))
    story.append(Spacer(1,3*mm))
    story.append(Paragraph(
        "Os upgrades sao opcionais. O produto ja funciona como esta. Mas o comprador tem o "
        "poder de evoluir a plataforma inteira por menos de R$3.100 usando agentes IA.",
        S['small']))
    story.append(PageBreak())

    # ══════ P6: COPY DE CONVERSAO ══════
    sec("05","Por Que Comprar Agora", story)

    story.append(Paragraph(
        "Vamos ser diretos. Existem 5 razoes pelas quais essa compra faz sentido <b>hoje</b>:",
        S['sale_bold']))
    story.append(Spacer(1,3*mm))

    reasons = [
        ("<b>1. O mercado esta aberto e ninguem entrou.</b>",
         "Pesquisamos 12 concorrentes no Brasil e no mundo. Nenhum oferece uma plataforma B2B "
         "de saude feminina corporativa. Zero. Esse gap nao vai durar para sempre. "
         "Wellhub (USD 3.29B), Zenklub e Vittude podem expandir a qualquer momento. "
         "Quem chegar primeiro, fica."),
        ("<b>2. A lei esta forcando empresas a comprar.</b>",
         "A Lei 14.611/2023 obriga mais de 50.000 empresas a reportar igualdade de genero. "
         "A multa e de 3% da folha de pagamento. A NR-1 2025 obriga gestao de riscos psicossociais. "
         "Essas empresas precisam de ferramentas. Voce vai ser essa ferramenta."),
        ("<b>3. O custo de replicar e 40x maior.</b>",
         "Contratar uma equipe para construir isso do zero custa R$ 200.000 a R$ 435.000 "
         "e leva 6-9 meses. Voce esta comprando por R$ 5.000 um produto que ja esta pronto, "
         "testado e no ar."),
        ("<b>4. A IA torna a evolucao barata.</b>",
         "Cada upgrade futuro custa centenas de reais, nao dezenas de milhares. "
         "Backend real? R$350. App mobile? R$800. Chatbot de IA? R$500. "
         "Voce evolui a plataforma inteira por menos de R$3.100."),
        ("<b>5. O payback e rapido.</b>",
         "Se voce vender o servico para apenas 3 empresas de 100 colaboradoras a R$15/mes "
         "(o plano mais barato), voce fatura R$4.500/mes. O investimento se paga no segundo mes. "
         "Com 10 clientes, voce fatura R$15.000/mes. Com 30, R$45.000/mes."),
    ]
    for title, desc in reasons:
        story.append(Paragraph(title, S['sale_bold']))
        story.append(Paragraph(desc, S['sale_copy']))
        story.append(Spacer(1,2*mm))

    story.append(Spacer(1,3*mm))
    story.append(Paragraph(
        "\"Nao estou vendendo um software. Estou vendendo 6 meses do seu tempo, "
        "R$200.000 em economia e a chance de ser o primeiro em um mercado de R$13 bilhoes.\"",
        S['quote']))
    story.append(PageBreak())

    # ══════ P7: SIMULACAO DE FATURAMENTO ══════
    sec("06","Simulacao: Quanto Voce Pode Faturar", story)

    story.append(Paragraph(
        "O comprador que operacionalizar a UniHER como SaaS pode atingir estas projecoes "
        "de receita mensal. Cenarios conservadores, baseados em benchmark de mercado:",
        S['body']))
    story.append(Spacer(1,3*mm))

    fat_h = ["Cenario","Clientes","Colaboradoras","PEPM","Receita MENSAL"]
    fat_r = [
        [Paragraph("Primeiros 3 meses", S['td']),
         Paragraph("3", S['td']),
         Paragraph("100 cada", S['td']),
         Paragraph("R$ 15", S['td']),
         Paragraph("<b>R$ 4.500</b>", S['td_b'])],
        [Paragraph("Mes 6", S['td']),
         Paragraph("10", S['td']),
         Paragraph("150 media", S['td']),
         Paragraph("R$ 20", S['td']),
         Paragraph("<b>R$ 30.000</b>", S['td_b'])],
        [Paragraph("Mes 12", S['td']),
         Paragraph("30", S['td']),
         Paragraph("200 media", S['td']),
         Paragraph("R$ 22", S['td']),
         Paragraph("<b>R$ 132.000</b>", S['td_b'])],
        [Paragraph("Mes 24", S['td']),
         Paragraph("80", S['td']),
         Paragraph("300 media", S['td']),
         Paragraph("R$ 25", S['td']),
         Paragraph("<b>R$ 600.000</b>", S['td_b'])],
    ]
    story.append(tbl(fat_h, fat_r, [30*mm, 22*mm, 30*mm, 22*mm, 32*mm]))
    story.append(Spacer(1,4*mm))

    story.append(Paragraph("Retorno sobre o investimento de R$ 5.000:", S['h2']))

    roi_h = ["Metrica","Valor"]
    roi_r = [
        [Paragraph("Investimento total", S['td_l']),
         Paragraph("<b>R$ 5.000</b>", S['td_rb'])],
        [Paragraph("Receita no 1o mes com 3 clientes", S['td_l']),
         Paragraph("<b>R$ 4.500</b>", S['td_rb'])],
        [Paragraph("Payback", S['td_l']),
         Paragraph("<b>34 dias</b>", ParagraphStyle('_pk', fontName='Helvetica-Bold', fontSize=10, leading=13, textColor=GREEN_600, alignment=TA_RIGHT))],
        [Paragraph("ROI em 6 meses (10 clientes)", S['td_l']),
         Paragraph("<b>R$ 180.000 / 3.500%</b>", S['td_rb'])],
        [Paragraph("ROI em 12 meses (30 clientes)", S['td_l']),
         Paragraph("<b>R$ 1.584.000 / 31.580%</b>", S['td_rb'])],
    ]
    story.append(tbl(roi_h, roi_r, [70*mm, 50*mm]))
    story.append(Spacer(1,4*mm))

    story.append(bx(
        "COM APENAS 3 CLIENTES, O INVESTIMENTO SE PAGA EM 34 DIAS.<br/>"
        "COM 10 CLIENTES, VOCE FATURA R$ 30.000/MES.",
        ROSE_50, ROSE_700))
    story.append(PageBreak())

    # ══════ P8: PROPOSTA FINAL ══════
    sec("07","Proposta Final", story)

    story.append(Spacer(1,4*mm))
    story.append(Paragraph("INVESTIMENTO TOTAL", S['hero_sub']))
    story.append(Spacer(1,2*mm))
    story.append(Paragraph("R$ 5.000", S['hero']))
    story.append(Paragraph("cinco mil reais  |  pagamento unico  |  sem mensalidade", S['hero_sub']))
    story.append(Spacer(1,6*mm))

    story.append(Paragraph("O que esta incluso:", S['h2']))
    items = [
        "Codigo-fonte completo (Git com historico) - 20.037 linhas",
        "101 arquivos fonte (46 TSX + 40 CSS + 14 TS + 1 config)",
        "Landing page profissional com 8 secoes e quiz interativo",
        "3 dashboards completos (RH, Lideranca, Colaboradora)",
        "Sistema de gamificacao (badges, desafios, streaks, niveis)",
        "Auth role-based com 3 perfis e navegacao diferenciada",
        "Design system premium cream/rose/gold com animacoes",
        "Deploy ativo na Vercel (uniher.vercel.app)",
        "4 PDFs de mercado (SWOT, Precificacao, Proposta, Custos)",
        "Pesquisa de 12 concorrentes com dados de pricing",
        "Roadmap de upgrades com custos estimados",
        "Transferencia integral de propriedade intelectual",
        "Direito de uso comercial ilimitado (revenda, SaaS, etc.)",
    ]
    for item in items:
        story.append(Paragraph(f"\u2713  {item}", S['check']))

    story.append(Spacer(1,5*mm))
    story.append(Paragraph("Condicoes de pagamento:", S['h3']))
    pay = [
        "<b>Opcao 1:</b> R$ 5.000 a vista (PIX ou transferencia)",
        "<b>Opcao 2:</b> 2x de R$ 2.700 (entrada + 30 dias) = R$ 5.400",
        "<b>Opcao 3:</b> 3x de R$ 1.900 (entrada + 30 + 60 dias) = R$ 5.700",
    ]
    for p in pay:
        story.append(Paragraph(f"\u2022  {p}", S['bullet']))

    story.append(Spacer(1,5*mm))

    story.append(cta_box(
        "UniHER  |  A unica plataforma B2B de saude feminina corporativa do Brasil<br/><br/>"
        "<font size='20'>R$ 5.000</font>  |  pagamento unico<br/><br/>"
        "Valor de mercado: R$ 112.000 - R$ 205.000<br/>"
        "Payback: 34 dias  |  ROI 12 meses: 31.580%<br/>"
        "Concorrentes diretos no Brasil: <font size='16'>zero</font>"
    ))

    story.append(Spacer(1,4*mm))
    story.append(Paragraph(
        "Proposta valida por 30 dias a partir da emissao (Marco 2026). Apos o prazo, "
        "o valor pode ser reajustado. Documento confidencial destinado exclusivamente "
        "para fins de avaliacao comercial.",
        S['small']))

    doc.build(story, onFirstPage=cover_bg, onLaterPages=page_bg)
    return out

if __name__ == "__main__":
    p = build_pdf()
    print(f"\nPDF gerado com sucesso!\n  {p}\n")
