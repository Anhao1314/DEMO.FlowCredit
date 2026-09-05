/* ============================================================
   data.js — FlowCredit mock dataset (two subjects) + constants.
   Raw values are verbatim demo data; every derived metric
   (NT / SCU / ValidNT / Efficiency / CCI / PD / Deviation)
   is computed at runtime in state.js. Do NOT hard-code results.
   ============================================================ */
const SUBJECTS = {
  healthy: {
    label:"Healthy Merchant",
    // Illustrative composite of public disclosures (CoreWeave S-1 / Nebius /
    // Northern Data ops updates, 2025-2026), scaled to demo size. See the
    // input manifest in the workspace for the full field mapping.
    l0:{ compute:{Input:"64.0M",Output:"16.0M",Raw:"80.0M",Requests:"3.2M",Model:"Flagship Reasoning",Task:"Inference"},
         physical:{GPUh:"4,200",GPU:"H100-equivalent",Util:"85%"},
         business:{Spend:"$58,000",Customers:"168",Top5:"36%",Repayment:"96%",Loop:"2%"} },
    coef:{w_model:1.2,w_task:1.0,c_gpu:1.0},
    // rawNT_M = NT in millions AFTER w_model x w_task is already applied.
    // It is NOT the Raw Token. Raw Token must come from l0.compute.Raw.
    rawNT_M:96.0, validRate:0.94, gpuHours:4200, util:0.85, scu:3570, money:"$58,000",
    waste:[["Idle Loop","2%"],["Duplicate","2%"],["Pulse Spike","1%"]],
    anchors:[ // name, sub, rawText, score(0-100), band[lo,hi], state g/y/r
      ["Efficiency","NT ÷ GPU·h","22,857 NT/h",76,[60,90],"g"],
      ["Repayment","inflow ÷ revenue","96%",88,[60,95],"g"],
      ["Customer","top-5 concentration","36%",86,[55,95],"g"],
      ["Cost","compute spend ÷ rev","stable",70,[50,90],"g"],
      ["Time / Sybil","smoothness · cluster","no cluster",72,[55,90],"g"] ],
    redflags:[],
    factors:[["Real Tx Ratio",92],["Customer Diversity",86],["Inflow Retention",96],["Sybil Cluster",94]],
    creditLine:20000, volatility:"7%", deviationPct:3, devAlert:false,
    R:[64,65,63,67,68,66,70,71], C:[62,63,62,65,66,65,68,69] // declared value / on-chain trusted value
  },
  sybil: {
    label:"Sybil Address",
    l0:{ compute:{Input:"78.0M",Output:"30.0M",Raw:"108.0M",Requests:"9.6M",Model:"General",Task:"Inference"},
         physical:{GPUh:"210",GPU:"Mixed",Util:"41%"},
         business:{Spend:"$9,800",Customers:"6",Top5:"91%",Repayment:"12%",Loop:"67%"} },
    coef:{w_model:1.0,w_task:1.0,c_gpu:1.0},
    rawNT_M:108.0, validRate:0.34, gpuHours:210, util:0.41, scu:86.1, money:"$9,800",
    waste:[["Idle Loop","42%"],["Duplicate","16%"],["Pulse Spike","8%"]],
    anchors:[
      ["Efficiency","NT ÷ GPU·h","514,286 NT/h · 23× band",34,[60,90],"r"],
      ["Repayment","inflow ÷ revenue","12%",20,[60,95],"r"],
      ["Customer","top-5 concentration","91%",22,[55,95],"r"],
      ["Cost","compute spend ÷ rev","erratic",50,[50,90],"y"],
      ["Time / Sybil","smoothness · cluster","cluster · loop 67%",44,[55,90],"r"] ],
    redflags:["Efficiency +2,150% above peer band","Top-5 91% > 80% related","Repayment 12% < 20%","Sybil cluster detected"],
    factors:[["Real Tx Ratio",21],["Customer Diversity",12],["Inflow Retention",12],["Sybil Cluster",8]],
    creditLine:0, volatility:"58%", deviationPct:186, devAlert:true,
    R:[26,28,27,30,29,31,30,31], C:[9,10,9,11,10,11,10,11]
  }
};
// weights: efficiency / repayment / customer / cost / time-series
const ANCHOR_W = [0.25,0.25,0.20,0.15,0.15];
