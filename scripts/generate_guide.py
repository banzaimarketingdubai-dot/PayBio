import os
import sys
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Custom canvas to calculate total page count and draw running headers/footers
    """
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        
        # Suppress headers/footers on page 1 (cover page)
        if self._pageNumber == 1:
            # Draw decorative elements on cover page
            # Sleek purple gradient top accent
            self.setFillColor(colors.HexColor('#0F172A'))
            self.rect(0, 0, 595.27, 841.89, fill=True, stroke=False)
            
            # Subtle decorative background grid/shapes
            self.setFillColor(colors.HexColor('#1E1B4B'))
            p = self.beginPath()
            p.moveTo(0, 500)
            p.lineTo(595.27, 300)
            p.lineTo(595.27, 0)
            p.lineTo(0, 0)
            p.close()
            self.drawPath(p, fill=True, stroke=False)
            
            # A bright orange-purple gradient flare/line
            self.setStrokeColor(colors.HexColor('#FF9500'))
            self.setLineWidth(4)
            self.line(0, 500, 595.27, 300)
            
            self.restoreState()
            return

        # Running Header
        self.setFont("Arial", 8)
        self.setFillColor(colors.HexColor('#64748B')) # Slate 500
        self.drawString(54, 800, "Как заработать $50-$100 на знаниях с помощью ИИ")
        self.drawRightString(541, 800, "Пошаговое руководство | Paybio.uno")
        
        self.setStrokeColor(colors.HexColor('#E2E8F0')) # Slate 200 thin border
        self.setLineWidth(0.5)
        self.line(54, 792, 541, 792)

        # Running Footer
        self.line(54, 50, 541, 50)
        self.drawString(54, 38, "Создано автоматически с помощью Paybio.uno")
        self.drawRightString(541, 38, f"Страница {self._pageNumber} из {page_count}")
        
        self.restoreState()

def create_guide_pdf(output_path, public_dir):
    # Setup document geometry (A4 is 595.27 x 841.89 points)
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=54,
        rightMargin=54,
        topMargin=64,
        bottomMargin=64
    )

    # Register Cyrillic Fonts from Windows Fonts folder
    font_path = "C:/Windows/Fonts/arial.ttf"
    font_bold_path = "C:/Windows/Fonts/arialbd.ttf"
    
    # Fallback to local files if Windows path doesn't work (unlikely on local system, but robust)
    if not os.path.exists(font_path):
        print("Arial font not found at C:/Windows/Fonts/arial.ttf. Looking for standard fonts.")
        # Attempt fallback
        for path in ["arial.ttf", "Arial.ttf"]:
            if os.path.exists(path):
                font_path = path
                break
    
    pdfmetrics.registerFont(TTFont('Arial', font_path))
    pdfmetrics.registerFont(TTFont('Arial-Bold', font_bold_path))

    styles = getSampleStyleSheet()
    
    # Custom Typography Styles (Explicitly using Arial for Cyrillic support)
    title_main_style = ParagraphStyle(
        'CoverTitle',
        fontName='Arial-Bold',
        fontSize=24,
        leading=30,
        textColor=colors.HexColor('#FFFFFF'),
        alignment=0, # Left-aligned for cover
        spaceAfter=15
    )
    
    title_sub_style = ParagraphStyle(
        'CoverSubtitle',
        fontName='Arial',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#94A3B8'), # Slate 400
        alignment=0,
        spaceAfter=40
    )

    cover_badge_style = ParagraphStyle(
        'CoverBadge',
        fontName='Arial-Bold',
        fontSize=10,
        leading=12,
        textColor=colors.HexColor('#FF9500'), # Orange
        spaceAfter=15
    )

    heading1_style = ParagraphStyle(
        'DocHeading1',
        fontName='Arial-Bold',
        fontSize=15,
        leading=19,
        textColor=colors.HexColor('#0F172A'), # Slate 900
        spaceBefore=18,
        spaceAfter=8,
        keepWithNext=True
    )

    heading2_style = ParagraphStyle(
        'DocHeading2',
        fontName='Arial-Bold',
        fontSize=11.5,
        leading=15,
        textColor=colors.HexColor('#3B82F6'), # Blue 500
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'DocBody',
        fontName='Arial',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor('#334155'), # Slate 700
        spaceBefore=4,
        spaceAfter=4
    )

    body_bold_style = ParagraphStyle(
        'DocBodyBold',
        parent=body_style,
        fontName='Arial-Bold'
    )

    prompt_style = ParagraphStyle(
        'PromptStyle',
        fontName='Arial',
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=4,
        spaceAfter=4
    )

    bullet_style = ParagraphStyle(
        'DocBullet',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=3
    )

    story_promo_style = ParagraphStyle(
        'StoryPromoStyle',
        fontName='Arial',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#059669'), # Emerald 600
        backColor=colors.HexColor('#ECFDF5'),
        borderColor=colors.HexColor('#A7F3D0'),
        borderWidth=0.5,
        borderPadding=6,
        spaceBefore=4,
        spaceAfter=4
    )

    story_promo_title = ParagraphStyle(
        'StoryPromoTitle',
        parent=story_promo_style,
        fontName='Arial-Bold'
    )

    story_prompt_style = ParagraphStyle(
        'StoryPromptStyle',
        parent=prompt_style,
        backColor=colors.HexColor('#FFFBEB'), # Amber 50
        borderColor=colors.HexColor('#FDE68A'), # Amber 200
        borderWidth=0.5,
        borderPadding=6
    )

    story_prompt_title = ParagraphStyle(
        'StoryPromptTitle',
        parent=story_prompt_style,
        fontName='Arial-Bold'
    )

    story_banner_ideas_style = ParagraphStyle(
        'StoryBannerIdeas',
        parent=body_style,
        leftIndent=10,
        spaceBefore=2
    )

    story_banner_title = ParagraphStyle(
        'StoryBannerTitle',
        parent=story_banner_ideas_style,
        fontName='Arial-Bold',
        textColor=colors.HexColor('#D97706') # Amber 600
    )

    story_concept_text = ParagraphStyle(
        'StoryConceptText',
        parent=story_banner_ideas_style,
        leftIndent=20
    )

    story_concept_bold = ParagraphStyle(
        'StoryConceptBold',
        parent=story_concept_text,
        fontName='Arial-Bold'
    )

    story_closing_title = ParagraphStyle(
        'StoryClosingTitle',
        parent=body_style,
        fontName='Arial-Bold',
        textColor=colors.HexColor('#0284C7'), # Light Blue 600
        spaceBefore=8,
        spaceAfter=4
    )

    story_closing_desc = ParagraphStyle(
        'StoryClosingDesc',
        parent=body_style,
        leftIndent=15,
        spaceAfter=3
    )

    story_closing_bold = ParagraphStyle(
        'StoryClosingBold',
        parent=story_closing_desc,
        fontName='Arial-Bold'
    )

    # Elements Flow
    story = []

    # ==================== PAGE 1: COVER PAGE ====================
    story.append(Spacer(1, 120))
    story.append(Paragraph("БЫСТРЫЙ СТАРТ &bull; БЕЗ ВЛОЖЕНИЙ", cover_badge_style))
    story.append(Paragraph("Как с помощью ИИ заработать от 50 до 100 долларов на своих знаниях без необходимости продавать прямо сегодня", title_main_style))
    story.append(Paragraph("Пошаговое практическое руководство по упаковке знаний в цифровой продукт и запуску полностью автоматизированных продаж в Telegram за 15 минут.", title_sub_style))
    story.append(Spacer(1, 140))
    
    # Metadata block at the bottom of the cover
    meta_text = """
    <b>Автор:</b> Команда Paybio.uno &amp; Gemini AI<br/>
    <b>Сложность:</b> Для начинающих (No-Code)<br/>
    <b>Время на внедрение:</b> 15-30 минут<br/>
    <b>Необходимые инструменты:</b> Telegram, Google Диск, Gemini AI
    """
    meta_style = ParagraphStyle(
        'CoverMeta',
        fontName='Arial',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor('#94A3B8')
    )
    story.append(Paragraph(meta_text, meta_style))
    story.append(PageBreak())

    # ==================== PAGE 2: STEP 1 & 2 ====================
    story.append(Paragraph("Введение: Почему продавать знания — это просто?", heading1_style))
    intro_p1 = """
    Каждый человек обладает уникальным практическим опытом или навыками. То, что кажется вам элементарным (умение вести домашнюю бухгалтерию в Excel, знание 20 разговорных фраз на испанском, опыт настройки рекламы или рецепты безглютеновой выпечки), имеет огромную ценность для тех, кто только начинает свой путь в этой теме. 
    <br/><br/>
    Люди готовы платить за <b>экономию времени</b>. Вместо того чтобы искать разрозненную информацию в Интернете, им проще купить готовый структурированный чек-лист или пошаговое руководство за $5-$10. Наша цель — упаковать эту ценность за 15 минут и настроить продажи «на автопилоте».
    """
    story.append(Paragraph(intro_p1, body_style))
    story.append(Spacer(1, 10))

    story.append(Paragraph("Шаг 1. Выделение вашей области знаний", heading1_style))
    step1_p = """
    Ответьте на три вопроса, чтобы найти свою тему для мини-гайда:
    """
    story.append(Paragraph(step1_p, body_style))
    story.append(Paragraph("&bull; <b>О чем вас чаще всего расспрашивают друзья и коллеги?</b> (советы по карьере, воспитанию детей, планированию путешествий, тренировкам, готовке).", bullet_style))
    story.append(Paragraph("&bull; <b>Какую рутинную задачу вы решаете быстрее и эффективнее других?</b> (шаблоны Excel, быстрая уборка, организация гардероба).", bullet_style))
    story.append(Paragraph("&bull; <b>Есть ли у вас профессиональный чек-лист или инструкция?</b> (как составить резюме, как подготовиться к собеседованию, шаблоны писем клиентам).", bullet_style))
    story.append(Paragraph("<b>Совет:</b> Выбирайте максимально узкую тему. Не пишите 'Как стать богатым'. Лучше напишите: '5 шагов, чтобы структурировать расходы и начать откладывать 10% дохода'.", body_style))
    story.append(Spacer(1, 10))

    story.append(Paragraph("Шаг 2. Мгновенная генерация текста с помощью Gemini AI", heading1_style))
    step2_p = """
    Вам не нужно писать текст самостоятельно. Используйте бесплатный ИИ <b>Gemini от Google</b>. Скопируйте промпт ниже, подставьте свою тему и отправьте нейросети:
    """
    story.append(Paragraph(step2_p, body_style))

    # Boxed Gemini Prompt
    prompt_text = """
    <b>СКОПИРУЙТЕ И ОТПРАВЬТЕ ЭТОТ ПРОМПТ В GEMINI:</b><br/>
    <i>"Напиши подробный практический гайд/чеклист на тему: <b>[ВСТАВЬТЕ ВАШУ ТЕМУ, например: '10 трюков в Excel для предпринимателей']</b>. 
    Структурируй его следующим образом:<br/>
    1. Введение (почему тема важна и какую боль клиента решает гайд).<br/>
    2. 5 конкретных шагов/лайфхаков с пошаговыми примерами реализации.<br/>
    3. Чек-лист для самопроверки в конце.<br/>
    Используй простой, мотивирующий и профессиональный тон, пиши без 'воды' и общих фраз. Пиши на русском языке. Сделай текст полностью готовым для копирования и оформления."</i>
    """
    
    # Render inside a beautiful light slate background table
    prompt_table = Table(
        [[Paragraph(prompt_text, prompt_style)]],
        colWidths=[487]
    )
    prompt_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
        ('PADDING', (0,0), (-1,-1), 12),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(prompt_table)
    
    step2_p2 = """
    <br/><b>Что делать дальше:</b><br/>
    1. Скопируйте полученный от Gemini текст.<br/>
    2. Откройте Google Документы (или Word) и вставьте текст.<br/>
    3. Оформите заголовки и выделите ключевые слова жирным шрифтом.<br/>
    4. Нажмите <b>Файл -> Скачать -> Документ PDF (.pdf)</b>.<br/>
    5. Загрузите полученный PDF на свой Google Диск, нажмите правой кнопкой мыши -> <b>Поделиться -> Доступ ограничен (изменить на 'Все, у кого есть ссылка')</b>. Скопируйте ссылку.
    """
    story.append(Paragraph(step2_p2, body_style))
    story.append(PageBreak())

    # ==================== PAGE 3: CREATING SHOP & CARD ====================
    story.append(Paragraph("Шаг 3. Создание вашего магазина на Paybio.uno", heading1_style))
    step3_p = """
    <b>Paybio.uno</b> — это специализированная Web3 Link-in-Bio витрина для Telegram, которая позволяет продавать файлы, курсы и доступы в закрытые каналы без комиссий и сложной регистрации.
    <br/><br/>
    1. Перейдите в Telegram-бот <b>@PaybioBot</b> (или на сайт <b>paybio.uno</b>).<br/>
    2. Запустите бот и следуйте простым инструкциям. ИИ-помощник автоматически создаст ваш интернет-магазин по вашему текстовому запросу или голосовому сообщению.<br/>
    3. Укажите название магазина и выберите аватар. Магазин будет доступен по удобной ссылке вида: <code>t.me/PaybioBot/store?startapp=ваш_юзернейм</code>
    """
    story.append(Paragraph(step3_p, body_style))
    
    # Image for Step 3
    img_sales_path = os.path.join(public_dir, "impulsive_sales.png")
    if os.path.exists(img_sales_path):
        story.append(Spacer(1, 5))
        story.append(KeepTogether([
            Image(img_sales_path, width=240, height=135),
            Paragraph("<i>Рисунок 1: Интерфейс быстрого создания магазина Paybio</i>", ParagraphStyle('Cap1', parent=body_style, fontSize=7.5, textColor=colors.HexColor('#64748B'), alignment=1))
        ]))
    story.append(Spacer(1, 10))

    story.append(Paragraph("Шаг 4. Добавление товара и ссылки на PDF", heading1_style))
    step4_p = """
    Теперь создадим карточку вашего цифрового товара, чтобы покупатели могли приобрести его автоматически:
    <br/><br/>
    1. В панели управления вашего магазина нажмите кнопку <b>"Добавить товар"</b>.<br/>
    2. Заполните <b>Название</b> (например, <i>"PDF-Гайд: Эффективный Excel"</i>) и добавьте <b>Описание</b>.<br/>
    3. Загрузите картинку-обложку товара (ее можно сгенерировать в Gemini или Canva).<br/>
    4. В поле <b>"Ссылка выдачи" (Delivery Link)</b> вставьте ссылку на ваш PDF-гайд, которую вы скопировали с Google Диска на Шаге 2.<br/>
    5. Сразу после оплаты клиент получит эту ссылку автоматически от Telegram-бота.
    """
    story.append(Paragraph(step4_p, body_style))
    story.append(PageBreak())

    # ==================== PAGE 4: PRICING & CARD SETTINGS ====================
    story.append(Paragraph("Шаг 5. Установка цены и привязка карты", heading1_style))
    step5_p = """
    Настроим финансовую часть вашего магазина для автоматического приема платежей:
    <br/><br/>
    1. <b>Установите цену в долларах</b>: Укажите цену в USD (например, $9 или $19). Paybio автоматически пересчитает эту стоимость в эквивалент <b>Telegram Stars</b> (официальная валюта Telegram) и криптовалюту TON.<br/>
    2. <b>Продажи за Telegram Stars</b>: Покупатели смогут мгновенно оплачивать ваш гайд в один клик. Полученные Stars накапливаются на вашем балансе, и их можно легко вывести на карту или крипто-кошелек через платформу Fragment.<br/>
    3. <b>Настройка прямых переводов на карту (P2P)</b>: Перейдите в настройки платежей вашего профиля. Введите номер вашей карты и имя получателя. Клиенты смогут переводить средства напрямую на вашу личную банковскую карту.
    """
    story.append(Paragraph(step5_p, body_style))
    
    # Image for Step 5
    img_pay_path = os.path.join(public_dir, "payment_options.png")
    if os.path.exists(img_pay_path):
        story.append(Spacer(1, 5))
        story.append(KeepTogether([
            Image(img_pay_path, width=220, height=135),
            Paragraph("<i>Рисунок 2: Выбор способов оплаты (Stars, Карты P2P, TON)</i>", ParagraphStyle('Cap2', parent=body_style, fontSize=7.5, textColor=colors.HexColor('#64748B'), alignment=1))
        ]))
    
    story.append(Spacer(1, 10))

    story.append(Paragraph("Шаг 6. Алгоритм автоматического закрытия сделки (Smart Fulfillment)", heading1_style))
    step6_p = """
    Paybio полностью решает проблему ручной проверки оплат и отправки файлов. Процесс закрытия сделки выглядит следующим образом:
    """
    story.append(Paragraph(step6_p, body_style))
    story.append(Paragraph("&bull; <b>Шаг А: Клиент переходит по ссылке</b> на товар в вашем магазине из Telegram Stories или каналов.", bullet_style))
    story.append(Paragraph("&bull; <b>Шаг Б: Выбор метода оплаты</b>. Клиент выбирает удобный способ: оплата через Telegram Stars (в один клик) или прямой P2P-перевод на вашу банковскую карту.", bullet_style))
    story.append(Paragraph("&bull; <b>Шаг В: Отправка квитанции</b>. Если клиент выбрал перевод на карту, он делает платеж в приложении своего банка по вашим реквизитам и отправляет скриншот чека прямо в окно покупки.", bullet_style))
    story.append(Paragraph("&bull; <b>Шаг Г: AI-верификация чека</b>. Встроенный ИИ-контролер Paybio анализирует скриншот чека на подлинность, проверяет реквизиты, сумму перевода и наличие фотошопа за 3 секунды.", bullet_style))
    story.append(Paragraph("&bull; <b>Шаг Д: Автоматическая выдача</b>. Сразу после успешного подтверждения (Stars или одобренный AI чек), бот мгновенно присылает клиенту сообщение со ссылкой на ваш PDF-гайд. <b>Вы зарабатываете деньги, не отвлекаясь на рутину!</b>", bullet_style))
    
    # Image for Step 6 (Conversion Gain)
    img_conv_path = os.path.join(public_dir, "conversion_gain.png")
    if os.path.exists(img_conv_path):
        story.append(Spacer(1, 5))
        story.append(KeepTogether([
            Image(img_conv_path, width=220, height=135),
            Paragraph("<i>Рисунок 3: Экран успешной оплаты и автоматической выдачи товара</i>", ParagraphStyle('Cap3', parent=body_style, fontSize=7.5, textColor=colors.HexColor('#64748B'), alignment=1))
        ]))
    story.append(PageBreak())

    # ==================== PAGE 5: PROMO BANNER & TG STORIES ====================
    story.append(Paragraph("Шаг 7. Реклама и привлечение трафика через Telegram Stories", heading1_style))
    step7_p = """
    У вас готов гайд и настроен автоматический прием платежей. Теперь нужно рассказать об этом вашей аудитории. Самый быстрый способ получить продажи сегодня без вложений — запустить <b>Telegram Stories</b> (или Stories в Instagram/VK).
    <br/><br/>
    <b>1. Сгенерируйте рекламный текст с помощью Gemini AI:</b><br/>
    Используйте этот промпт для нейросети, чтобы составить продающий и вовлекающий текст для Stories:
    """
    story.append(Paragraph(step7_p, body_style))

    # Boxed Stories Prompt
    stories_prompt_text = """
    <b>СКОПИРУЙТЕ И ОТПРАВЬТЕ ЭТОТ ПРОМПТ В GEMINI:</b><br/>
    <i>"Напиши продающий текст для Stories (длиной до 250 символов) для рекламы моего цифрового гайда на тему: <b>[ВСТАВЬТЕ НАЗВАНИЕ ВАШЕГО ГАЙДА]</b>. 
    Текст должен начинаться с интригующего вопроса или боли клиента, показывать пользу от прочтения гайда и завершаться призывом кликнуть на ссылку. 
    Напиши 3 различных варианта текста (коротких и емких) и предложи к каждому варианту идею фонового изображения."</i>
    """
    stories_prompt_table = Table(
        [[Paragraph(stories_prompt_text, story_prompt_style)]],
        colWidths=[487]
    )
    stories_prompt_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FFFDF5')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#FDE68A')),
        ('PADDING', (0,0), (-1,-1), 10),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(stories_prompt_table)
    story.append(Spacer(1, 8))

    # Example of generated stories options
    story.append(Paragraph("Примеры готовых рекламных концепций:", heading2_style))
    
    story.append(Paragraph("Вариант 1 (Кликбейт и польза):", story_banner_title))
    story.append(Paragraph("<b>Текст:</b> <i>'Тратите часы на заполнение отчетов в Excel? 📊 Собрал 10 формул, которые сэкономят вам до 5 часов в неделю. Забирайте пошаговый PDF-гайд по ссылке ниже!'</i>", story_banner_ideas_style))
    story.append(Paragraph("<b>Визуал:</b> Скриншот красивой, структурированной Excel-таблицы с яркими графиками и стрелкой вниз на стикер со ссылкой.", story_concept_text))
    story.append(Spacer(1, 4))
    
    story.append(Paragraph("Вариант 2 (Через проблему):", story_banner_title))
    story.append(Paragraph("<b>Текст:</b> <i>'Инвестируете кучу денег в обучение, а результаты нулевые? 🤯 Напишите свой первый мини-гайд с помощью ИИ за 15 минут и заработайте первые $50 на знаниях уже сегодня. Подробности в гайде!'</i>", story_banner_ideas_style))
    story.append(Paragraph("<b>Визуал:</b> Фото ноутбука с открытым чатом Gemini AI и открытым Telegram-ботом Paybio.", story_concept_text))
    story.append(Spacer(1, 8))

    story.append(Paragraph("2. Как разместить Stories со ссылкой на ваш магазин:", heading2_style))
    stories_steps = """
    1. Откройте Telegram на телефоне и нажмите значок создания Stories в правом верхнем углу (или сдвиньте экран вправо).<br/>
    2. Добавьте фоновое изображение (сгенерированное с помощью ИИ или скачанное в хорошем качестве).<br/>
    3. Разместите рекламный текст от Gemini на фото.<br/>
    4. Нажмите на иконку <b>Стикеры (Sticker)</b> и выберите <b>"Ссылка" (Link)</b>.<br/>
    5. Вставьте ссылку на ваш цифровой товар из Paybio (вида: <code>https://t.me/PaybioBot/store?startapp=ваш_магазин-product_id</code>).<br/>
    6. Добавьте стрелочки или анимации, указывающие на стикер-ссылку. Опубликуйте Stories!<br/>
    7. Дублируйте этот креатив в Instagram Stories, Telegram-каналы, личные чаты и тематические сообщества.
    """
    story.append(Paragraph(stories_steps, body_style))

    # Image for Step 7 (Story Ads)
    img_stories_path = os.path.join(public_dir, "story_ads.png")
    if os.path.exists(img_stories_path):
        story.append(Spacer(1, 5))
        story.append(KeepTogether([
            Image(img_stories_path, width=220, height=135),
            Paragraph("<i>Рисунок 4: Пример рекламного объявления в Telegram Stories с прикрепленной ссылкой</i>", ParagraphStyle('Cap4', parent=body_style, fontSize=7.5, textColor=colors.HexColor('#64748B'), alignment=1))
        ]))
    story.append(Spacer(1, 10))

    # Final call to action box
    final_box_text = """
    <b>ДЕЙСТВУЙТЕ ПРЯМО СЕЙЧАС:</b><br/>
    Не откладывайте на завтра. ИИ берет на себя 90% рутинной работы по написанию текстов, а Paybio полностью автоматизирует прием платежей и выдачу гайдов вашим клиентам. Начните с малого: выделите одну тему, настройте продажи и сделайте первую Stories прямо сегодня. <b>Ваш пассивный доход ждет вас!</b>
    """
    final_box_table = Table(
        [[Paragraph(final_box_text, story_promo_title)]],
        colWidths=[487]
    )
    final_box_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#ECFDF5')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#A7F3D0')),
        ('PADDING', (0,0), (-1,-1), 12),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(final_box_table)

    # Build the document
    doc.build(story, canvasmaker=NumberedCanvas)
    print("PDF guide generated successfully!")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python generate_guide.py <output_path> <public_dir>")
        sys.exit(1)
    
    out_p = sys.argv[1]
    pub_d = sys.argv[2]
    
    create_guide_pdf(out_p, pub_d)
