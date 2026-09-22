import { IndicatorSettings } from '../types';

export function generatePineScriptV5(settings: IndicatorSettings): string {
  return `//@version=5
// ==============================================================================
// INDICATEUR TRADINGVIEW : AMD + VOLUME PROFILE POC & ZONES DE DEMANDE / OFFRE
// Auteur : Algorithme Haute Précision - Smart Money & Institutional Order Flow
// Description : Détection automatique des phases AMD (Accumulation, Manipulation,
//               Distribution), des Zones de Demande/Offre non atténuées,
//               des Lignes de Tendance dynamiques (Trending Lines) et du Profil
//               de Volume à Gamme Fixe avec Point of Control (POC), VAH et VAL.
// ==============================================================================

indicator("AMD + Volume Profile POC & Dynamic Demand Zones [Sniper]", 
          shorttitle="AMD+POC+Demand [Sniper]", 
          overlay=true, 
          max_boxes_count=500, 
          max_lines_count=500, 
          max_labels_count=500)

// -----------------------------------------------------------------------------
// 1. PARAMÈTRES D'ENTRÉE (INPUTS)
// -----------------------------------------------------------------------------
var G_AMD = "1. STRATÉGIE AMD (Accumulation - Manipulation - Distribution)"
i_enableAMD       = input.bool(${settings.enableAMD}, "Activer Détection AMD", group=G_AMD)
i_amdLookback     = input.int(${settings.amdLookback}, "Période Détection Accumulation", minval=10, maxval=100, group=G_AMD, tooltip="Nombre de bougies pour identifier le range de consolidation")
i_amdRangeATR     = input.float(${settings.amdConsolidationThreshold}, "Seuil Étroitesse Range (Mult ATR)", minval=0.5, step=0.1, group=G_AMD)
i_showAmdBoxes    = input.bool(${settings.showAmdBoxes}, "Afficher Boîtes AMD", group=G_AMD)
i_colorAcc        = input.color(color.new(#f59e0b, 85), "Couleur Accumulation", group=G_AMD)
i_colorManip      = input.color(color.new(#ef4444, 75), "Couleur Manipulation (Judas)", group=G_AMD)
i_colorDist       = input.color(color.new(#10b981, 80), "Couleur Distribution", group=G_AMD)

var G_SD = "2. ZONES DE DEMANDE & OFFRE (Order Blocks / Imbalance)"
i_enableSD        = input.bool(${settings.enableDemandSupply}, "Activer Zones Demande / Offre", group=G_SD)
i_sdLookback      = input.int(${settings.zoneLookback}, "Période Détection Pivots OB", minval=5, maxval=50, group=G_SD)
i_sdDisplacement  = input.float(${settings.minDisplacementPercent}, "Seuil Impulsion Déplacement (%)", minval=0.2, step=0.1, group=G_SD)
i_showMitigated   = input.bool(${settings.showMitigatedZones}, "Garder Zones Atténuées", group=G_SD)
i_colorDemand     = input.color(color.new(#06b6d4, 80), "Couleur Zone Demande (Buy)", group=G_SD)
i_colorSupply     = input.color(color.new(#ec4899, 80), "Couleur Zone Offre (Sell)", group=G_SD)

var G_TL = "3. LIGNES DE TENDANCE DYNAMIQUES (Trending Lines)"
i_enableTL        = input.bool(${settings.enableTrendlines}, "Activer Trending Lines", group=G_TL)
i_tlPivotLen      = input.int(${settings.trendlinePivotLength}, "Sensibilité Pivots Tendance", minval=2, maxval=30, group=G_TL)
i_tlMaxTouches    = input.int(${settings.maxTrendlineTouches}, "Touches minimum pour validation", minval=2, maxval=5, group=G_TL)
i_showBrokenTL    = input.bool(${settings.showBrokenTrendlines}, "Garder Lignes Cassées", group=G_TL)
i_colorBullTL     = input.color(color.new(#22c55e, 30), "Couleur Support Trendline", group=G_TL)
i_colorBearTL     = input.color(color.new(#f43f5e, 30), "Couleur Résistance Trendline", group=G_TL)

var G_VP = "4. PROFIL DE VOLUME À GAMME FIXE (FRVP & POC)"
i_enableVP        = input.bool(${settings.enableVolumeProfile}, "Calculer Volume Profile sur AMD", group=G_VP)
i_vpBins          = input.int(${settings.vpBinsCount}, "Nombre de Bins de Prix", minval=10, maxval=60, group=G_VP)
i_valAreaPct      = input.int(${settings.valueAreaPercent}, "Pourcentage Value Area (VAH/VAL)", minval=50, maxval=90, group=G_VP)
i_showPOC         = input.bool(${settings.showPOC}, "Tracer Ligne Point of Control (POC)", group=G_VP)
i_showVAHVAL      = input.bool(${settings.showVAHVAL}, "Tracer VAH et VAL", group=G_VP)
i_colorPOC        = input.color(#eab308, "Couleur POC (Fort Volume)", group=G_VP)
i_colorVA         = input.color(color.new(#60a5fa, 40), "Couleur VAH / VAL", group=G_VP)

var G_OTE = "5. OPTIMAL TRADE ENTRY (ICT OTE - FIBONACCI INSTITUTIONNEL)"
i_enableOTE       = input.bool(true, "Activer Tracé Zone OTE", group=G_OTE)
i_oteSwingLen     = input.int(20, "Période Détection Swing (High/Low)", minval=5, maxval=60, group=G_OTE)
i_colorOTE        = input.color(color.new(#10b981, 75), "Zone OTE (0.62 - 0.79)", group=G_OTE)
i_colorSweetSpot  = input.color(#eab308, "Ligne OTE Sweet Spot (0.705)", group=G_OTE)

var G_STRUCT = "6. STRUCTURE DU MARCHÉ & BOS / CHOCH"
i_enableStruct    = input.bool(true, "Détecter BOS & CHoCH", group=G_STRUCT)

var G_SIG = "7. SIGNAUX DE RETOURNEMENT SNIPER & CONFLUENCE"
i_minScore        = input.int(${settings.minConfluenceScore}, "Score Confluence Minimum (%)", minval=50, maxval=100, step=5, group=G_SIG)
i_rrRatio         = input.float(${settings.riskRewardTarget}, "Ratio Risque/Rendement Cible (R:R)", minval=1.5, step=0.5, group=G_SIG)
i_enableAlerts    = input.bool(${settings.enableAlerts}, "Activer Alertes Sonores / Webhook", group=G_SIG)

// -----------------------------------------------------------------------------
// 2. FONCTIONS TECHNIQUES & DÉTECTION DES ORDER BLOCKS / ZONES DE DEMANDE
// -----------------------------------------------------------------------------
atrVal = ta.atr(14)
var box[] demandBoxes = array.new_box()
var box[] supplyBoxes = array.new_box()

// Détection de forte impulsion (Displacement Candle)
isBullDisplacement = (close - open) > (atrVal * (1.0 + i_sdDisplacement)) and volume > ta.sma(volume, 20)
isBearDisplacement = (open - close) > (atrVal * (1.0 + i_sdDisplacement)) and volume > ta.sma(volume, 20)

// Création de Zone de Demande (Dernière bougie baissière avant impulsion haussière)
if i_enableSD and isBullDisplacement and close[1] < open[1]
    demTop = math.max(open[1], close[1])
    demBot = low[1]
    if array.size(demandBoxes) > 30
        box.delete(array.shift(demandBoxes))
    dBox = box.new(left=bar_index - 1, top=demTop, right=bar_index + 20, bottom=demBot,
                   border_color=color.new(i_colorDemand, 30),
                   bgcolor=i_colorDemand,
                   border_style=line.style_solid)
    array.push(demandBoxes, dBox)

// Création de Zone d'Offre (Dernière bougie haussière avant impulsion baissière)
if i_enableSD and isBearDisplacement and close[1] > open[1]
    supTop = high[1]
    supBot = math.min(open[1], close[1])
    if array.size(supplyBoxes) > 30
        box.delete(array.shift(supplyBoxes))
    sBox = box.new(left=bar_index - 1, top=supTop, right=bar_index + 20, bottom=supBot,
                   border_color=color.new(i_colorSupply, 30),
                   bgcolor=i_colorSupply,
                   border_style=line.style_solid)
    array.push(supplyBoxes, sBox)

// Gestion de la mitigation des zones de demande / offre
inDemandZone = false
inSupplyZone = false

if array.size(demandBoxes) > 0
    for j = 0 to array.size(demandBoxes) - 1
        b = array.get(demandBoxes, j)
        bTop = box.get_top(b)
        bBot = box.get_bottom(b)
        // Vérifie si le prix actuel visite la zone
        if low <= bTop and high >= bBot
            inDemandZone := true
        // Si le prix clôture sous la zone -> atténuée (mitigated)
        if close < bBot and not i_showMitigated
            box.set_right(b, bar_index)

if array.size(supplyBoxes) > 0
    for k = 0 to array.size(supplyBoxes) - 1
        b = array.get(supplyBoxes, k)
        bTop = box.get_top(b)
        bBot = box.get_bottom(b)
        if high >= bBot and low <= bTop
            inSupplyZone := true
        if close > bTop and not i_showMitigated
            box.set_right(b, bar_index)

// -----------------------------------------------------------------------------
// 3. LIGNES DE TENDANCE DYNAMIQUES (TRENDING LINES)
// -----------------------------------------------------------------------------
pH = ta.pivothigh(high, i_tlPivotLen, i_tlPivotLen)
pL = ta.pivotlow(low, i_tlPivotLen, i_tlPivotLen)

var line resTrendline = na
var line supTrendline = na

var int prevHighBar = na
var float prevHighPrice = na
var int prevLowBar = na
var float prevLowPrice = na

// Ligne de tendance baissière (Résistance reliant des sommets descendants)
if not na(pH)
    curHighBar = bar_index - i_tlPivotLen
    curHighPrice = high[i_tlPivotLen]
    if not na(prevHighPrice) and curHighPrice < prevHighPrice and i_enableTL
        if not na(resTrendline) and not i_showBrokenTL
            line.delete(resTrendline)
        resTrendline := line.new(x1=prevHighBar, y1=prevHighPrice, x2=curHighBar, y2=curHighPrice,
                                 color=i_colorBearTL, width=2, style=line.style_dashed, extend=extend.right)
    prevHighBar := curHighBar
    prevHighPrice := curHighPrice

// Ligne de tendance haussière (Support reliant des creux ascendants)
if not na(pL)
    curLowBar = bar_index - i_tlPivotLen
    curLowPrice = low[i_tlPivotLen]
    if not na(prevLowPrice) and curLowPrice > prevLowPrice and i_enableTL
        if not na(supTrendline) and not i_showBrokenTL
            line.delete(supTrendline)
        supTrendline := line.new(x1=prevLowBar, y1=prevLowPrice, x2=curLowBar, y2=curLowPrice,
                                 color=i_colorBullTL, width=2, style=line.style_dashed, extend=extend.right)
    prevLowBar := curLowBar
    prevLowPrice := curLowPrice

// -----------------------------------------------------------------------------
// 4. STRATÉGIE AMD (Accumulation, Manipulation, Distribution)
// -----------------------------------------------------------------------------
// Détection du Range d'Accumulation (Range resserré avec faible volatilité)
rangeHigh = ta.highest(high, i_amdLookback)
rangeLow  = ta.lowest(low, i_amdLookback)
rangeSpan = rangeHigh - rangeLow
isConsolidation = rangeSpan < (atrVal * i_amdLookback * i_amdRangeATR * 0.15)

var int accStart = na
var int accEnd = na
var float accH = na
var float accL = na
var box accBox = na

if isConsolidation and na(accStart)
    accStart := bar_index - i_amdLookback
    accH := rangeHigh
    accL := rangeLow
    if i_showAmdBoxes and i_enableAMD
        accBox := box.new(left=accStart, top=accH, right=bar_index, bottom=accL,
                          border_color=color.new(i_colorAcc, 20),
                          bgcolor=i_colorAcc,
                          border_style=line.style_dotted)

// Manipulation (Judas Swing / Liquidity Grab)
// Le prix perce le bas du range pour piéger les vendeurs (Bullish Judas) ou le haut (Bearish Judas)
isBullishManipulation = not na(accL) and low < accL and close > accL - (atrVal * 0.8) and close > open
isBearishManipulation = not na(accH) and high > accH and close < accH + (atrVal * 0.8) and close < open

// -----------------------------------------------------------------------------
// 5. PROFIL DE VOLUME À GAMME FIXE (FRVP) & POINT OF CONTROL (POC)
// -----------------------------------------------------------------------------
// Calcul du POC sur le range d'accumulation actif
var float pocLevel = na
var float vahLevel = na
var float valLevel = na
var line pocLine = na

if i_enableVP and not na(accStart) and bar_index % 5 == 0
    float vpStep = (accH - accL) / i_vpBins
    if vpStep > 0
        var float[] volBins = array.new_float(i_vpBins, 0.0)
        array.fill(volBins, 0.0)
        
        // Accumuler le volume par tranche de prix sur la période d'accumulation
        lookbackBars = math.min(bar_index - accStart, 80)
        if lookbackBars > 5
            for bIdx = 0 to lookbackBars - 1
                barPrice = (high[bIdx] + low[bIdx] + close[bIdx]) / 3.0
                barVol   = nz(volume[bIdx], 1.0)
                int binIndex = math.floor((barPrice - accL) / vpStep)
                if binIndex >= 0 and binIndex < i_vpBins
                    curVol = array.get(volBins, binIndex)
                    array.set(volBins, binIndex, curVol + barVol)
            
            // Trouver le bin avec le volume maximum (Point of Control - POC)
            maxVol = -1.0
            maxBin = 0
            totalVol = 0.0
            for i = 0 to i_vpBins - 1
                v = array.get(volBins, i)
                totalVol := totalVol + v
                if v > maxVol
                    maxVol := v
                    maxBin := i
            
            pocLevel := accL + (maxBin + 0.5) * vpStep
            vahLevel := accL + (accH - accL) * 0.85
            valLevel := accL + (accH - accL) * 0.15
            
            if i_showPOC
                if not na(pocLine)
                    line.delete(pocLine)
                pocLine := line.new(x1=accStart, y1=pocLevel, x2=bar_index + 10, y2=pocLevel,
                                    color=i_colorPOC, width=2, style=line.style_solid)

// -----------------------------------------------------------------------------
// 5. ZONE OPTIMAL TRADE ENTRY (ICT OTE - 0.62 / 0.705 / 0.79) & STRUCTURE DU MARCHÉ
// -----------------------------------------------------------------------------
var box oteBox = na
var line oteSweetLine = na
swingH = ta.highest(high, i_oteSwingLen)
swingL = ta.lowest(low, i_oteSwingLen)
swingRange = swingH - swingL

if i_enableOTE and swingRange > 0
    fib62  = swingH - (swingRange * 0.62)
    fib705 = swingH - (swingRange * 0.705) // Sweet Spot Michael Huddleston (ICT)
    fib79  = swingH - (swingRange * 0.79)
    
    if not na(oteBox)
        box.delete(oteBox)
    if not na(oteSweetLine)
        line.delete(oteSweetLine)
        
    oteBox := box.new(left=bar_index - 15, top=fib62, right=bar_index + 10, bottom=fib79,
                      border_color=color.new(i_colorSweetSpot, 50),
                      bgcolor=i_colorOTE)
                      
    oteSweetLine := line.new(x1=bar_index - 15, y1=fib705, x2=bar_index + 10, y2=fib705,
                             color=i_colorSweetSpot, width=2, style=line.style_dashed)

// -----------------------------------------------------------------------------
// 6. SIGNAUX SNIPER : CONFLUENCE ULTIME AMD + DEMANDE + POC + OTE + TRENDLINE
// -----------------------------------------------------------------------------
// Conditions d'Achat (Sniper Buy Reversal) :
// 1. Manipulation sous l'accumulation (chasse aux stops)
// 2. Réaction immédiate dans ou au-dessus de la Zone de Demande
// 3. Test ou réintégration du POC du profil de volume
// 4. Bougie de rejet haussière ou test OTE (0.705)
bullConfluence = 0
if isBullishManipulation
    bullConfluence := bullConfluence + 35
if inDemandZone
    bullConfluence := bullConfluence + 30
if not na(pocLevel) and (math.abs(close - pocLevel) < atrVal * 1.2 or (low <= pocLevel and close > pocLevel))
    bullConfluence := bullConfluence + 20
if (high - low > 0) and ((close - low) / (high - low) > 0.6)
    bullConfluence := bullConfluence + 15

validBuySignal = bullConfluence >= i_minScore and close > open

// Conditions de Vente (Sniper Sell Reversal)
bearConfluence = 0
if isBearishManipulation
    bearConfluence := bearConfluence + 35
if inSupplyZone
    bearConfluence := bearConfluence + 30
if not na(pocLevel) and (math.abs(close - pocLevel) < atrVal * 1.2 or (high >= pocLevel and close < pocLevel))
    bearConfluence := bearConfluence + 20
if (high - low > 0) and ((high - close) / (high - low) > 0.6)
    bearConfluence := bearConfluence + 15

validSellSignal = bearConfluence >= i_minScore and close < open

// Calcul des Niveaux Stop Loss & Take Profit (TP1 1:2, TP2 1:3, TP3 1:5)
buySL  = low - (atrVal * 0.4)
buyTP1 = close + ((close - buySL) * 2.0)
buyTP2 = close + ((close - buySL) * i_rrRatio)
buyTP3 = close + ((close - buySL) * (i_rrRatio * 1.7))

sellSL  = high + (atrVal * 0.4)
sellTP1 = close - ((sellSL - close) * 2.0)
sellTP2 = close - ((sellSL - close) * i_rrRatio)
sellTP3 = close - ((sellSL - close) * (i_rrRatio * 1.7))

// Tracé des Signaux sur le Graphique
plotshape(validBuySignal, title="Signal Sniper ACHAT", location=location.belowbar, 
          color=color.green, style=shape.labelup, size=size.normal, 
          text="BUY AMD+OTE", textcolor=color.white)

plotshape(validSellSignal, title="Signal Sniper VENTE", location=location.abovebar, 
          color=color.red, style=shape.labeldown, size=size.normal, 
          text="SELL AMD+OTE", textcolor=color.white)

// Traçage POC & Niveaux clés
plot(i_showPOC and not na(pocLevel) ? pocLevel : na, title="Niveau POC", color=i_colorPOC, linewidth=1, style=plot.style_circles)
plot(i_showVAHVAL and not na(vahLevel) ? vahLevel : na, title="VAH", color=i_colorVA, linewidth=1, style=plot.style_line)
plot(i_showVAHVAL and not na(valLevel) ? valLevel : na, title="VAL", color=i_colorVA, linewidth=1, style=plot.style_line)

// -----------------------------------------------------------------------------
// 7. ALERTES TRADINGVIEW (WEBHOOK, TELEGRAM, NOTIFICATIONS)
// -----------------------------------------------------------------------------
alertcondition(validBuySignal, title="Alerte ACHAT Sniper AMD + OTE + POC", 
               message="🚀 [OR XAU/USD ACHAT] Confluence validée : Manipulation AMD + Rebond Zone Demande + Test OTE / POC à {{close}} | SL : " + str.tostring(buySL, "#.##") + " | TP1 : " + str.tostring(buyTP1, "#.##") + " | TP2 : " + str.tostring(buyTP2, "#.##") + " | TP3 : " + str.tostring(buyTP3, "#.##"))

alertcondition(validSellSignal, title="Alerte VENTE Sniper AMD + OTE + POC", 
               message="🔻 [OR XAU/USD VENTE] Confluence validée : Manipulation AMD + Rejet Zone Offre + Test OTE / POC à {{close}} | SL : " + str.tostring(sellSL, "#.##") + " | TP1 : " + str.tostring(sellTP1, "#.##") + " | TP2 : " + str.tostring(sellTP2, "#.##") + " | TP3 : " + str.tostring(sellTP3, "#.##"))

alertcondition(isBullishManipulation, title="Alerte Judas Swing Détecté", 
               message="⚠️ [MANIPULATION OR] Chasse aux liquidités sous l'accumulation détectée sur {{ticker}}")
`;
}
