import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np

output_dir = r"c:\Users\ranja\Downloads\pawalert\diagrams"
os.makedirs(output_dir, exist_ok=True)

plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['DejaVu Sans', 'Arial', 'Helvetica']

def save_fig(fig, filename):
    filepath = os.path.join(output_dir, filename)
    fig.savefig(filepath, dpi=300, bbox_inches='tight', facecolor='#ffffff')
    plt.close(fig)
    print(f"Generated: {filename}")

# ==========================================
# 1. Figure 1.1: Conceptual Civic Incident Management Pipeline
# ==========================================
def gen_fig1_1():
    fig, ax = plt.subplots(figsize=(11, 4.5))
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 4.5)
    ax.axis('off')

    stages = [
        ("1. Citizen Detection", "• Live Camera Snap\n• Browser WGS-84 GPS\n• Species Selection\n• Road Hazard Tags", '#e0f2fe', '#0284c7', 0.5),
        ("2. AI Verification", "• MobileNetV2 Gate\n• Softmax Confidence\n• pHash Fingerprint\n• 120m Spatial Dedupe", '#eff6ff', '#2563eb', 2.6),
        ("3. Spatial Clustering", "• DBSCAN Algorithm\n• Haversine Distance\n• Hotspot Centroid\n• Danger Perimeter", '#fef08a', '#ca8a04', 4.7),
        ("4. Emergency Dispatch", "• Socket.IO Push\n• 7-Stage Tracker\n• Ambulance Routing\n• Vet Care Intake", '#dcfce7', '#16a34a', 6.8),
        ("5. Civic Remediation", "• Hazard Analytics\n• Work Order Assign\n• Before/After Photo\n• Geotagged Proof", '#f3e8ff', '#9333ea', 8.9)
    ]

    for title, desc, bg, bd, x in stages:
        box = patches.FancyBboxPatch((x, 0.6), 1.8, 3.2, boxstyle="round,pad=0.08,rounding_size=0.15",
                                     linewidth=1.5, edgecolor=bd, facecolor=bg)
        ax.add_patch(box)
        ax.text(x + 0.9, 3.4, title, ha='center', va='center', fontsize=9, weight='bold', color=bd)
        ax.plot([x + 0.1, x + 1.7], [3.15, 3.15], color=bd, linewidth=0.8)
        ax.text(x + 0.15, 1.8, desc, fontsize=7.8, color='#1e293b', va='center')

    for i in range(4):
        x_start = stages[i][4] + 1.8
        x_end = stages[i+1][4]
        ax.annotate('', xy=(x_end, 2.2), xytext=(x_start, 2.2),
                    arrowprops=dict(arrowstyle="->", color="#475569", lw=1.8))

    save_fig(fig, "fig1_1_civic_pipeline.png")

# ==========================================
# 2. Figure 2.1: Conventional Reporting Bottleneck
# ==========================================
def gen_fig2_1():
    fig, ax = plt.subplots(figsize=(11, 4.8))
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 4.8)
    ax.axis('off')

    steps = [
        ("Citizen Witness", "Sees injured stray animal\non road corridor", 0.5, '#f1f5f9', '#64748b'),
        ("Manual Channel", "Dial-in phone helpline or\nsocial media broadcast", 2.6, '#fee2e2', '#dc2626'),
        ("Information Gaps", "• Approximate landmarks\n• No verified photo\n• Duplicate calls", 4.7, '#fee2e2', '#dc2626'),
        ("Delayed Dispatch", "Volunteers search blindly;\n1 to 4 hours latency", 6.8, '#fee2e2', '#dc2626'),
        ("Unresolved Hazards", "Case closed; road flaw\n(lighting/speed) remains!", 8.9, '#fef2f2', '#b91c1c')
    ]

    for title, desc, x, bg, bd in steps:
        box = patches.FancyBboxPatch((x, 0.8), 1.8, 3.0, boxstyle="round,pad=0.08,rounding_size=0.15",
                                     linewidth=1.5, edgecolor=bd, facecolor=bg)
        ax.add_patch(box)
        ax.text(x + 0.9, 3.4, title, ha='center', va='center', fontsize=9, weight='bold', color=bd)
        ax.plot([x + 0.1, x + 1.7], [3.15, 3.15], color=bd, linewidth=0.8)
        ax.text(x + 0.15, 1.9, desc, fontsize=8, color='#1e293b', va='center')

    for i in range(4):
        x_start = steps[i][2] + 1.8
        x_end = steps[i+1][2]
        ax.annotate('', xy=(x_end, 2.3), xytext=(x_start, 2.3),
                    arrowprops=dict(arrowstyle="->", color="#dc2626", lw=1.8))
        ax.text((x_start+x_end)/2, 2.55, "Delay", ha='center', fontsize=7.5, color='#dc2626', weight='bold')

    save_fig(fig, "fig2_1_conventional_bottleneck.png")

# ==========================================
# 3. Figure 3.1: High-Level PawAlert AI Architecture
# ==========================================
def gen_fig3_1():
    fig, ax = plt.subplots(figsize=(11, 7.5))
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 8.5)
    ax.axis('off')

    layers = [
        ("Layer 1 — Presentation Layer (Role-Specific Client Dashboards)", 6.3, 7.9, '#f8fafc', '#0284c7', [
            ("Citizen Web / PWA\n(Report + GeoCam)", 0.8, 6.5, 2.1, 0.9, '#e0f2fe', '#0284c7'),
            ("Driver Safety HUD\n(Live GPS Proximity)", 3.3, 6.5, 2.1, 0.9, '#fef08a', '#ca8a04'),
            ("NGO Rescuer Portal\n(Dispatch & Ambulance)", 5.8, 6.5, 2.1, 0.9, '#dcfce7', '#16a34a'),
            ("Municipality GIS Portal\n(Remediation & Proofs)", 8.3, 6.5, 2.1, 0.9, '#f3e8ff', '#9333ea')
        ]),
        ("Layer 2 — Application Backend (Node.js & Express)", 4.3, 5.9, '#f8fafc', '#2563eb', [
            ("Reverse Proxy & CORS\n(Rate Limiting, SSL)", 0.8, 4.5, 2.2, 0.9, '#eff6ff', '#2563eb'),
            ("REST API Gateway & JWT Auth\n(Incident Ingestion & Control)", 3.4, 4.5, 4.0, 0.9, '#eff6ff', '#2563eb'),
            ("Socket.IO Engine\n(< 120ms Broadcast)", 7.8, 4.5, 2.6, 0.9, '#fee2e2', '#dc2626')
        ]),
        ("Layer 3 — Intelligence & Geospatial Analytics Microservices", 2.3, 3.9, '#f8fafc', '#059669', [
            ("Python FastAPI (MobileNetV2)\n(Dog / Cat / Cattle Classifier)", 0.8, 2.5, 3.2, 0.9, '#ecfdf5', '#059669'),
            ("DBSCAN Spatial Clustering Engine\n(Haversine Metric, eps=450m)", 4.4, 2.5, 3.2, 0.9, '#ecfdf5', '#059669'),
            ("Deduplication Engine\n(120m Geo Buffer)", 8.0, 2.5, 2.4, 0.9, '#ecfdf5', '#059669')
        ]),
        ("Layer 4 — Data Persistence & Storage Layer", 0.3, 1.9, '#f8fafc', '#475569', [
            ("MongoDB Database Engine (2dsphere Geospatial Indexing)", 0.8, 0.5, 4.8, 0.8, '#f1f5f9', '#475569'),
            ("Cloud Object Storage / Geotagged Image Repository", 6.0, 0.5, 4.4, 0.8, '#f1f5f9', '#475569')
        ])
    ]

    for title, y_b, y_t, bg, bd, sub_boxes in layers:
        rect = patches.FancyBboxPatch((0.5, y_b), 10.0, y_t - y_b, boxstyle="round,pad=0.08,rounding_size=0.15",
                                      linewidth=1.4, edgecolor=bd, facecolor=bg, linestyle='--')
        ax.add_patch(rect)
        ax.text(0.7, y_t - 0.25, title, fontsize=10, weight='bold', color=bd)
        for name, bx, by, bw, bh, bbg, bbd in sub_boxes:
            box = patches.FancyBboxPatch((bx, by), bw, bh, boxstyle="round,pad=0.06,rounding_size=0.1",
                                         linewidth=1.1, edgecolor=bbd, facecolor=bbg)
            ax.add_patch(box)
            ax.text(bx + bw/2, by + bh/2, name, ha='center', va='center', fontsize=8, weight='bold', color='#1e293b')

    # Directional Arrows
    for y_top_arrow in [6.3, 4.3, 2.3]:
        ax.annotate('', xy=(5.5, y_top_arrow - 0.4), xytext=(5.5, y_top_arrow),
                    arrowprops=dict(facecolor='#64748b', edgecolor='#64748b', width=1.5, headwidth=6, headlength=7))

    save_fig(fig, "fig3_1_architecture.png")

# ==========================================
# 4. Figure 3.2: Component Interaction Model
# ==========================================
def gen_fig3_2():
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 6)
    ax.axis('off')

    comps = [
        ("Citizen App\n(React)", 1.2, 4.6, '#e0f2fe', '#0284c7'),
        ("Driver HUD\n(React)", 1.2, 1.4, '#fef08a', '#ca8a04'),
        ("Express Backend\n& REST API", 5.0, 4.6, '#eff6ff', '#2563eb'),
        ("Socket.IO\nServer", 5.0, 1.4, '#fee2e2', '#dc2626'),
        ("FastAPI AI\nService", 8.8, 4.6, '#ecfdf5', '#059669'),
        ("MongoDB\nDatabase", 8.8, 1.4, '#f1f5f9', '#475569')
    ]

    for title, cx, cy, bg, bd in comps:
        box = patches.FancyBboxPatch((cx - 1.0, cy - 0.55), 2.0, 1.1, boxstyle="round,pad=0.08,rounding_size=0.12",
                                     linewidth=1.4, edgecolor=bd, facecolor=bg)
        ax.add_patch(box)
        ax.text(cx, cy, title, ha='center', va='center', fontsize=8.5, weight='bold', color='#1e293b')

    # Connectors
    arrows = [
        ((2.2, 4.8), (4.0, 4.8), "POST /api/reports"),
        ((4.0, 4.4), (2.2, 4.4), "HTTP 201 Response"),
        ((6.0, 4.8), (7.8, 4.8), "POST /classify"),
        ((7.8, 4.4), (6.0, 4.4), "Animal Class + Conf"),
        ((5.0, 4.05), (5.0, 1.95), "Trigger Broadcast"),
        ((6.0, 1.4), (7.8, 1.4), "Query / Update GeoJSON"),
        ((4.0, 1.4), (2.2, 1.4), "WebSocket Geofence Alert")
    ]

    for (x1, y1), (x2, y2), lbl in arrows:
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle="->", color="#334155", lw=1.3))
        ax.text((x1+x2)/2, (y1+y2)/2 + 0.15, lbl, ha='center', fontsize=7.2, weight='bold', color='#1d4ed8')

    save_fig(fig, "fig3_2_component_interaction.png")

# ==========================================
# 5. Figure 3.3: UML Use Case Diagram
# ==========================================
def gen_fig3_3():
    fig, ax = plt.subplots(figsize=(11, 7.5))
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 7.5)
    ax.axis('off')

    # System boundary box
    sys_box = patches.FancyBboxPatch((2.6, 0.4), 5.8, 6.8, boxstyle="round,pad=0.08,rounding_size=0.1",
                                     linewidth=1.5, edgecolor='#2563eb', facecolor='#f8fafc')
    ax.add_patch(sys_box)
    ax.text(5.5, 6.85, "«System Boundary» PawAlert AI Platform", ha='center', fontsize=10.5, weight='bold', color='#1d4ed8')

    # Use Cases
    ucs = [
        ("Report Animal Accident (Photo + GPS)", 5.5, 6.1),
        ("Verify Animal via MobileNetV2 AI", 5.5, 5.2),
        ("Spatial Deduplication (120m Buffer)", 5.5, 4.3),
        ("Receive Proximity Siren Warning HUD", 5.5, 3.4),
        ("Dispatch Ambulance & Update 7-Stage Rescue", 5.5, 2.5),
        ("Review Hazard Pareto & Submit Geotagged Proof", 5.5, 1.6),
        ("Audit Platform State & Tune DBSCAN", 5.5, 0.7)
    ]

    for text, cx, cy in ucs:
        el = patches.Ellipse((cx, cy), 4.8, 0.6, edgecolor='#0284c7', facecolor='#e0f2fe', linewidth=1.2)
        ax.add_patch(el)
        ax.text(cx, cy, text, ha='center', va='center', fontsize=7.8, weight='bold', color='#0f172a')

    # Actors
    actors_left = [
        ("Citizen", 1.2, 5.5, [0, 1]),
        ("Driver", 1.2, 3.4, [3])
    ]
    actors_right = [
        ("NGO / Rescuer", 9.8, 4.0, [4]),
        ("Municipal Authority", 9.8, 2.2, [5]),
        ("Administrator", 9.8, 0.9, [6])
    ]

    for name, ax_x, ax_y, targets in actors_left:
        # Draw Actor box
        abox = patches.FancyBboxPatch((ax_x - 0.7, ax_y - 0.4), 1.4, 0.8, boxstyle="round,pad=0.05,rounding_size=0.08",
                                      linewidth=1.2, edgecolor='#334155', facecolor='#ffffff')
        ax.add_patch(abox)
        ax.text(ax_x, ax_y, f"«Actor»\n{name}", ha='center', va='center', fontsize=8, weight='bold', color='#1e293b')
        for t in targets:
            ax.plot([ax_x + 0.7, ucs[t][1] - 2.4], [ax_y, ucs[t][2]], color='#64748b', linewidth=1.2)

    for name, ax_x, ax_y, targets in actors_right:
        abox = patches.FancyBboxPatch((ax_x - 0.8, ax_y - 0.4), 1.6, 0.8, boxstyle="round,pad=0.05,rounding_size=0.08",
                                      linewidth=1.2, edgecolor='#334155', facecolor='#ffffff')
        ax.add_patch(abox)
        ax.text(ax_x, ax_y, f"«Actor»\n{name}", ha='center', va='center', fontsize=7.8, weight='bold', color='#1e293b')
        for t in targets:
            ax.plot([ax_x - 0.8, ucs[t][1] + 2.4], [ax_y, ucs[t][2]], color='#64748b', linewidth=1.2)

    save_fig(fig, "fig3_3_use_case.png")

# ==========================================
# 6. Figure 3.4: Sequence Diagram for Incident Reporting
# ==========================================
def gen_fig3_4():
    fig, ax = plt.subplots(figsize=(11, 7.5))
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 8.0)
    ax.axis('off')

    actors = [
        ("Citizen App", 1.0),
        ("Express Backend", 3.2),
        ("FastAPI (MobileNetV2)", 5.6),
        ("MongoDB 2dsphere", 8.0),
        ("Socket.IO", 10.0)
    ]

    for name, x in actors:
        box = patches.FancyBboxPatch((x - 0.8, 7.2), 1.6, 0.6, boxstyle="round,pad=0.05,rounding_size=0.08",
                                     linewidth=1.2, edgecolor='#0284c7', facecolor='#e0f2fe')
        ax.add_patch(box)
        ax.text(x, 7.5, name, ha='center', va='center', fontsize=7.8, weight='bold', color='#0369a1')
        ax.plot([x, x], [7.2, 0.4], linestyle='--', color='#94a3b8', linewidth=1)

    steps = [
        (1.0, 3.2, 6.6, "1. POST /api/reports (Photo + GPS)", False),
        (3.2, 5.6, 5.9, "2. /classify (Image Buffer)", False),
        (5.6, 3.2, 5.2, "3. Predicted: 'Dog', Conf: 96%", True),
        (3.2, 8.0, 4.5, "4. Check 120m Duplicate Radius", False),
        (8.0, 3.2, 3.8, "5. Status: Unique (0 duplicates)", True),
        (3.2, 8.0, 3.1, "6. Insert AccidentReport Document", False),
        (3.2, 10.0, 2.4, "7. Emit 'report:new' WebSocket Event", False),
        (10.0, 10.0, 1.7, "8. Broadcast to Drivers & NGOs", False, True),
        (3.2, 1.0, 1.0, "9. Return 201 Created (Ticket ID)", True)
    ]

    for item in steps:
        if len(item) == 5 and item[4]: # self loop
            x1, y = item[0], item[2]
            ax.annotate('', xy=(x1, y - 0.25), xytext=(x1, y),
                        arrowprops=dict(arrowstyle="->", color="#dc2626", lw=1.3, connectionstyle="arc3,rad=-0.5"))
            ax.text(x1 - 0.15, y - 0.12, item[3], fontsize=7.2, weight='bold', color='#dc2626', ha='right')
        else:
            x1, x2, y, txt, is_ret = item[:5]
            ls = "--" if is_ret else "-"
            col = "#059669" if is_ret else "#1e293b"
            ax.annotate('', xy=(x2, y), xytext=(x1, y),
                        arrowprops=dict(arrowstyle="->", linestyle=ls, color=col, lw=1.3))
            ax.text((x1+x2)/2, y + 0.12, txt, fontsize=7.2, weight='bold', color=col, ha='center')

    save_fig(fig, "fig3_4_sequence.png")

# ==========================================
# 7. Figure 3.5: Activity Diagram
# ==========================================
def gen_fig3_5():
    fig, ax = plt.subplots(figsize=(8.5, 9.5))
    ax.set_xlim(0, 8.5)
    ax.set_ylim(0, 10.0)
    ax.axis('off')

    # Start
    start = patches.Circle((4.25, 9.4), 0.18, facecolor='#1e293b')
    ax.add_patch(start)

    nodes = [
        ("Open Reporting Form & Capture Photo / GPS", 4.25, 8.6, 4.4, 0.5, '#e0f2fe', '#0284c7', False),
        ("Verify Animal via MobileNetV2 Classifier", 4.25, 7.6, 4.4, 0.5, '#e0f2fe', '#0284c7', False),
        ("Is Valid Animal?\n(Conf >= 70%)", 4.25, 6.5, 2.6, 0.8, '#fef08a', '#ca8a04', True),
        ("Query DB for Incidents within 120m Radius", 4.25, 5.3, 4.4, 0.5, '#e0f2fe', '#0284c7', False),
        ("Is Duplicate?", 4.25, 4.2, 2.4, 0.8, '#fef08a', '#ca8a04', True),
        ("Persist Report to MongoDB with GeoJSON Point", 4.25, 3.0, 4.4, 0.5, '#dcfce7', '#16a34a', False),
        ("Trigger DBSCAN Recalculation & Hotspot Refresh", 4.25, 2.0, 4.4, 0.5, '#dcfce7', '#16a34a', False),
        ("Notify NGO Queue & Driver Proximity HUD", 4.25, 1.0, 4.4, 0.5, '#f3e8ff', '#9333ea', False)
    ]

    for title, cx, cy, w, h, bg, bd, is_diamond in nodes:
        if is_diamond:
            diamond = patches.Polygon([[cx, cy + h/2], [cx + w/2, cy], [cx, cy - h/2], [cx - w/2, cy]],
                                      closed=True, edgecolor=bd, facecolor=bg, linewidth=1.4)
            ax.add_patch(diamond)
            ax.text(cx, cy, title, ha='center', va='center', fontsize=7.5, weight='bold', color='#854d0e')
        else:
            box = patches.FancyBboxPatch((cx - w/2, cy - h/2), w, h, boxstyle="round,pad=0.06,rounding_size=0.1",
                                         linewidth=1.2, edgecolor=bd, facecolor=bg)
            ax.add_patch(box)
            ax.text(cx, cy, title, ha='center', va='center', fontsize=7.8, weight='bold', color='#1e293b')

    # Side Rejections
    rej1 = patches.FancyBboxPatch((6.8, 6.25), 1.4, 0.5, boxstyle="round,pad=0.04,rounding_size=0.08",
                                  linewidth=1.2, edgecolor='#dc2626', facecolor='#fee2e2')
    ax.add_patch(rej1)
    ax.text(7.5, 6.5, "Reject Photo\n(Non-Animal)", ha='center', va='center', fontsize=7, weight='bold', color='#991b1b')

    rej2 = patches.FancyBboxPatch((6.8, 3.95), 1.4, 0.5, boxstyle="round,pad=0.04,rounding_size=0.08",
                                  linewidth=1.2, edgecolor='#dc2626', facecolor='#fee2e2')
    ax.add_patch(rej2)
    ax.text(7.5, 4.2, "Consolidate\n(Duplicate)", ha='center', va='center', fontsize=7, weight='bold', color='#991b1b')

    # Arrows
    arrows = [
        ((4.25, 9.22), (4.25, 8.85)),
        ((4.25, 8.35), (4.25, 7.85)),
        ((4.25, 7.35), (4.25, 6.9)),
        ((4.25, 6.1), (4.25, 5.55)),
        ((4.25, 5.05), (4.25, 4.6)),
        ((4.25, 3.8), (4.25, 3.25)),
        ((4.25, 2.75), (4.25, 2.25)),
        ((4.25, 1.75), (4.25, 1.25)),
        ((5.55, 6.5), (6.8, 6.5)), # No animal
        ((5.45, 4.2), (6.8, 4.2))  # Duplicate
    ]

    for (x1, y1), (x2, y2) in arrows:
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle="->", color="#334155", lw=1.2))

    ax.text(4.45, 5.85, "[Yes]", fontsize=7, color='#15803d', weight='bold')
    ax.text(4.45, 3.55, "[No]", fontsize=7, color='#15803d', weight='bold')
    ax.text(6.0, 6.65, "[No]", fontsize=7, color='#dc2626', weight='bold')
    ax.text(6.0, 4.35, "[Yes]", fontsize=7, color='#dc2626', weight='bold')

    # End
    end = patches.Circle((4.25, 0.4), 0.18, facecolor='#ffffff', edgecolor='#1e293b', linewidth=2)
    ax.add_patch(end)
    end_in = patches.Circle((4.25, 0.4), 0.11, facecolor='#1e293b')
    ax.add_patch(end_in)
    ax.annotate('', xy=(4.25, 0.6), xytext=(4.25, 0.75),
                arrowprops=dict(arrowstyle="->", color="#334155", lw=1.2))

    save_fig(fig, "fig3_5_activity.png")

# ==========================================
# 8. Figure 3.6: Data Flow Diagram – Level 0
# ==========================================
def gen_fig3_6():
    fig, ax = plt.subplots(figsize=(10, 6.5))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 6.5)
    ax.axis('off')

    # Process 0.0
    p = patches.Circle((5.0, 3.25), 1.4, facecolor='#e0f2fe', edgecolor='#0284c7', linewidth=2)
    ax.add_patch(p)
    ax.text(5.0, 3.7, "0.0", fontsize=11, weight='bold', color='#0369a1', ha='center')
    ax.text(5.0, 3.2, "PawAlert AI\nSystem Platform", fontsize=9.5, weight='bold', color='#0f172a', ha='center')

    # Entities
    ents = [
        ("Citizen", 1.0, 4.8, 1.8, 1.0),
        ("Driver", 1.0, 1.2, 1.8, 1.0),
        ("NGO / Rescuer", 7.2, 4.8, 1.8, 1.0),
        ("Authority", 7.2, 1.2, 1.8, 1.0)
    ]

    for name, x, y, w, h in ents:
        box = patches.Rectangle((x, y), w, h, facecolor='#f8fafc', edgecolor='#334155', linewidth=1.5)
        ax.add_patch(box)
        ax.text(x + w/2, y + h/2, name, ha='center', va='center', fontsize=8.5, weight='bold', color='#1e293b')

    flows = [
        ((2.8, 5.5), (4.0, 4.2), "Incident Photo + GPS"),
        ((4.0, 3.9), (2.8, 5.0), "Report Acknowledgment"),
        ((2.8, 1.9), (3.9, 2.7), "Live Driver GPS"),
        ((3.9, 2.4), (2.8, 1.4), "Danger Siren Warning"),
        ((6.1, 4.2), (7.2, 5.4), "Emergency Dispatch Notice"),
        ((7.2, 4.9), (6.1, 3.9), "7-Stage Rescue Update"),
        ((6.1, 2.7), (7.2, 1.9), "Hotspot Cause Analytics"),
        ((7.2, 1.4), (6.1, 2.4), "Remediation Proof Image")
    ]

    for (x1, y1), (x2, y2), lbl in flows:
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle="->", color="#475569", lw=1.2))
        ax.text((x1+x2)/2, (y1+y2)/2 + 0.12, lbl, fontsize=6.8, weight='bold', color='#0369a1', ha='center')

    save_fig(fig, "fig3_6_dfd0.png")

# ==========================================
# 9. Figure 3.7: Data Flow Diagram – Level 1
# ==========================================
def gen_fig3_7():
    fig, ax = plt.subplots(figsize=(11, 7.5))
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 8.0)
    ax.axis('off')

    procs = [
        ("1.0\nAuthentication", 1.8, 6.2),
        ("2.0\nAI Vision Triage", 4.5, 6.2),
        ("3.0\nDeduplication", 7.2, 6.2),
        ("4.0\nDBSCAN Clustering", 9.5, 6.2),
        ("5.0\nGeofence Siren", 9.5, 2.4),
        ("6.0\nRescue Pipeline", 5.5, 2.4),
        ("7.0\nProof Audit", 1.8, 2.4)
    ]

    for title, cx, cy in procs:
        c = patches.Circle((cx, cy), 0.8, facecolor='#e0f2fe', edgecolor='#0284c7', linewidth=1.4)
        ax.add_patch(c)
        ax.text(cx, cy, title, ha='center', va='center', fontsize=7.2, weight='bold', color='#0f172a')

    stores = [
        ("D1: Users", 1.8, 4.3),
        ("D2: AccidentReports", 5.8, 4.3),
        ("D3: Hotspots", 9.5, 4.3)
    ]

    for name, cx, cy in stores:
        w, h = 2.0, 0.4
        x, y = cx - w/2, cy - h/2
        ax.plot([x, x + w], [y + h, y + h], color='#334155', linewidth=1.5)
        ax.plot([x, x + w], [y, y], color='#334155', linewidth=1.5)
        ax.text(cx, cy, name, ha='center', va='center', fontsize=7.2, weight='bold', color='#334155')

    # Connections
    flows = [
        ((2.6, 6.2), (3.7, 6.2), "Token"),
        ((5.3, 6.2), (6.4, 6.2), "Animal Valid"),
        ((8.0, 6.2), (8.7, 6.2), "Unique"),
        ((7.2, 5.4), (6.2, 4.5), "Save Report"),
        ((9.5, 5.4), (9.5, 4.5), "Update Hotspots"),
        ((9.5, 4.1), (9.5, 3.2), "Hotspot Coords"),
        ((5.8, 4.1), (5.5, 3.2), "Open Cases"),
        ((1.8, 3.2), (1.8, 4.1), "Admin Auth")
    ]

    for (x1, y1), (x2, y2), lbl in flows:
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle="->", color="#2563eb", lw=1.2))
        ax.text((x1+x2)/2 + 0.25, (y1+y2)/2, lbl, fontsize=6.8, weight='bold', color='#1d4ed8')

    save_fig(fig, "fig3_7_dfd1.png")

# ==========================================
# 10. Figure 3.8: Entity-Relationship Diagram
# ==========================================
def gen_fig3_8():
    fig, ax = plt.subplots(figsize=(11, 7.5))
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 8.0)
    ax.axis('off')

    entities = [
        ("USER", 0.6, 4.5, 2.5, 2.6, [
            "PK  _id: ObjectId",
            "    name: String",
            "    email: String (UK)",
            "    passwordHash: String",
            "    role: Enum",
            "    phone: String"
        ]),
        ("ACCIDENT_REPORT", 4.2, 4.2, 3.0, 3.2, [
            "PK  _id: ObjectId",
            "FK  citizenId: ObjectId",
            "FK  clusterId: ObjectId",
            "    animalType: Enum",
            "    aiConfidence: Float",
            "    location: GeoJSON Point",
            "    imageUrl: String",
            "    status: Enum"
        ]),
        ("HOTSPOT", 8.2, 4.5, 2.4, 2.6, [
            "PK  _id: ObjectId",
            "    clusterId: Number",
            "    centerLat: Float",
            "    centerLng: Float",
            "    radius: Float",
            "    riskLevel: Enum"
        ]),
        ("RESCUE_REQUEST", 1.8, 0.8, 3.0, 2.4, [
            "PK  _id: ObjectId",
            "FK  reportId: ObjectId",
            "FK  assignedNgoId: ObjectId",
            "    currentStage: Int (1..7)",
            "    resolvedAt: Timestamp"
        ]),
        ("AUTHORITY_ACTION", 6.8, 0.8, 3.4, 2.6, [
            "PK  _id: ObjectId",
            "FK  hotspotId: ObjectId",
            "FK  officialUserId: ObjectId",
            "    actionType: Enum",
            "    beforeImageUrl: String",
            "    solvedImageUrl: String"
        ])
    ]

    for title, x, y, w, h, fields in entities:
        box = patches.Rectangle((x, y), w, h, facecolor='#ffffff', edgecolor='#1e293b', linewidth=1.4)
        ax.add_patch(box)
        hdr = patches.Rectangle((x, y + h - 0.45), w, 0.45, facecolor='#f1f5f9', edgecolor='#1e293b', linewidth=1)
        ax.add_patch(hdr)
        ax.text(x + w/2, y + h - 0.22, title, ha='center', va='center', fontsize=8.5, weight='bold', color='#0f172a')
        
        y_cur = y + h - 0.7
        for f in fields:
            is_pk = "PK" in f
            is_fk = "FK" in f
            col = "#dc2626" if is_pk else ("#0284c7" if is_fk else "#334155")
            ax.text(x + 0.12, y_cur, f, fontsize=7.2, color=col, weight="bold" if (is_pk or is_fk) else "normal")
            y_cur -= 0.26

    # Relationships
    ax.annotate('', xy=(4.2, 5.7), xytext=(3.1, 5.7), arrowprops=dict(arrowstyle="-|>", color="#0284c7", lw=1.3))
    ax.text(3.65, 5.85, "1 : N", fontsize=7.5, weight='bold', color='#0284c7')

    ax.annotate('', xy=(7.2, 5.7), xytext=(8.2, 5.7), arrowprops=dict(arrowstyle="-|>", color="#0284c7", lw=1.3))
    ax.text(7.6, 5.85, "N : 1", fontsize=7.5, weight='bold', color='#0284c7')

    ax.annotate('', xy=(3.3, 3.2), xytext=(4.5, 4.2), arrowprops=dict(arrowstyle="-|>", color="#16a34a", lw=1.3))
    ax.text(3.5, 3.8, "1 : 1 Triggers", fontsize=7.2, weight='bold', color='#16a34a')

    ax.annotate('', xy=(8.5, 3.4), xytext=(9.0, 4.5), arrowprops=dict(arrowstyle="-|>", color="#9333ea", lw=1.3))
    ax.text(9.0, 3.8, "1 : N Fixes", fontsize=7.2, weight='bold', color='#9333ea')

    save_fig(fig, "fig3_8_er_diagram.png")

# ==========================================
# 11. Figure 4.1: DBSCAN Spatial Clustering Model
# ==========================================
def gen_fig4_1():
    fig, ax = plt.subplots(figsize=(9, 6))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 7)
    ax.axis('off')

    # Hotspot Cluster Circle
    cluster = patches.Circle((4.5, 3.8), 2.5, facecolor='#fee2e2', edgecolor='#dc2626', linewidth=2, linestyle='--', alpha=0.5)
    ax.add_patch(cluster)
    ax.text(4.5, 6.5, "Accident Hotspot Cluster (eps = 450m, MinPts = 2)", fontsize=9, weight='bold', color='#b91c1c', ha='center')

    # Centroid
    ax.scatter([4.5], [3.8], color='#dc2626', s=140, marker='*', zorder=6)
    ax.text(4.5, 3.4, "Cluster Centroid", fontsize=7.8, weight='bold', color='#991b1b', ha='center')

    # Core Points
    core_pts = [(4.0, 4.5), (5.2, 4.1), (3.8, 3.2), (4.8, 3.0), (5.4, 4.7)]
    for px, py in core_pts:
        ax.scatter([px], [py], color='#2563eb', s=70, zorder=5)
        c_eps = patches.Circle((px, py), 0.8, facecolor='none', edgecolor='#93c5fd', linewidth=0.8, linestyle=':')
        ax.add_patch(c_eps)
    ax.text(3.3, 4.7, "Core Point (>= MinPts)", fontsize=7.5, color='#1d4ed8', weight='bold')

    # Border Points
    border_pts = [(2.6, 3.6), (6.2, 3.3)]
    for bx, by in border_pts:
        ax.scatter([bx], [by], color='#ca8a04', s=60, zorder=5)
    ax.text(6.4, 3.1, "Border Point", fontsize=7.5, color='#a16207', weight='bold')

    # Noise Points
    ax.scatter([8.5], [5.8], color='#64748b', s=60, zorder=5)
    ax.text(8.5, 5.3, "Noise Point\n(Isolated Outlier)", fontsize=7.5, color='#475569', ha='center', weight='bold')

    save_fig(fig, "fig4_1_dbscan_model.png")

# ==========================================
# 12. Figure 4.2: Haversine Geofencing Model
# ==========================================
def gen_fig4_2():
    fig, ax = plt.subplots(figsize=(9, 5.5))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 6)
    ax.axis('off')

    # Hotspot center
    hz = patches.Circle((3.5, 3.0), 2.2, facecolor='#fee2e2', edgecolor='#dc2626', linewidth=2, linestyle='--', alpha=0.5)
    ax.add_patch(hz)
    ax.scatter([3.5], [3.0], color='#dc2626', s=120, marker='*', zorder=5)
    ax.text(3.5, 3.25, "Hotspot Center", fontsize=8.5, weight='bold', color='#991b1b', ha='center')
    ax.text(3.5, 1.1, "500m Hazard Warning Radius", fontsize=8, weight='bold', color='#dc2626', ha='center')

    # Moving Vehicle
    ax.scatter([7.5], [4.5], color='#16a34a', s=140, marker='^', zorder=5)
    ax.text(7.5, 4.85, "Driver Vehicle GPS\n(Latitude, Longitude)", fontsize=8, weight='bold', color='#15803d', ha='center')

    # Distance line
    ax.plot([3.5, 7.5], [3.0, 4.5], color='#dc2626', linestyle='-', linewidth=2)
    ax.text(5.5, 4.0, "Haversine Distance d\nd <= 500m -> TRIGGER SIREN!", fontsize=8.5, weight='bold', color='#b91c1c', ha='center')

    # Heading arrow
    ax.annotate('', xy=(5.0, 3.5), xytext=(7.2, 4.3),
                arrowprops=dict(arrowstyle="->", color="#15803d", lw=2))

    save_fig(fig, "fig4_2_haversine_geofencing.png")

# ==========================================
# 13. Figure 4.3: End-to-End Workflow
# ==========================================
def gen_fig4_3():
    fig, ax = plt.subplots(figsize=(10, 7.5))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 8.5)
    ax.axis('off')

    flow_boxes = [
        ("1. Citizen Spotting & Live Photo Capture", 5.0, 7.8, '#e0f2fe', '#0284c7'),
        ("2. Browser GPS Geolocation Extraction", 5.0, 6.8, '#e0f2fe', '#0284c7'),
        ("3. AI Animal Classification (MobileNetV2 Softmax)", 5.0, 5.8, '#eff6ff', '#2563eb'),
        ("4. Spatial & Perceptual Hash Deduplication Check", 5.0, 4.8, '#eff6ff', '#2563eb'),
        ("5. Persistent Storage in MongoDB GeoJSON 2dsphere", 5.0, 3.8, '#dcfce7', '#16a34a'),
        ("6. DBSCAN Hotspot Clustering & Centroid Recalculation", 5.0, 2.8, '#fef08a', '#ca8a04'),
        ("7. Multi-Tenant Broadcast (Driver Alert + NGO Dispatch)", 5.0, 1.8, '#f3e8ff', '#9333ea'),
        ("8. Civic Remediation with Before/After Geotagged Proof", 5.0, 0.8, '#ecfdf5', '#059669')
    ]

    for title, cx, cy, bg, bd in flow_boxes:
        box = patches.FancyBboxPatch((cx - 3.2, cy - 0.32), 6.4, 0.64, boxstyle="round,pad=0.06,rounding_size=0.1",
                                     linewidth=1.3, edgecolor=bd, facecolor=bg)
        ax.add_patch(box)
        ax.text(cx, cy, title, ha='center', va='center', fontsize=8.5, weight='bold', color='#1e293b')

    for i in range(len(flow_boxes) - 1):
        ax.annotate('', xy=(5.0, flow_boxes[i+1][2] + 0.32), xytext=(5.0, flow_boxes[i][2] - 0.32),
                    arrowprops=dict(arrowstyle="->", color="#475569", lw=1.5))

    save_fig(fig, "fig4_3_workflow.png")

# ==========================================
# 14. Figure 4.4: Camera Proof and GPS Acquisition
# ==========================================
def gen_fig4_4():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 4.8))

    # Before Proof
    ax1.set_xlim(0, 10)
    ax1.set_ylim(0, 10)
    ax1.axis('off')
    box1 = patches.Rectangle((0.5, 0.5), 9, 9, facecolor='#fef2f2', edgecolor='#dc2626', linewidth=2)
    ax1.add_patch(box1)
    ax1.text(5, 8.5, "[BEFORE REMEDIATION PROOF]", ha='center', fontsize=9.5, weight='bold', color='#dc2626')
    ax1.text(5, 5.0, "Hazard: Poor Street Lighting\n& High Vehicle Speed\n\nPhoto: Dark Corridors\nNo Street Lamp Installed", ha='center', va='center', fontsize=8.5, color='#1e293b')
    ax1.text(5, 1.5, "Geotag: 8.7139° N, 77.7567° E\nAccuracy: +/- 8.2m | Timestamp Verified", ha='center', fontsize=7.5, color='#64748b')

    # After Proof
    ax2.set_xlim(0, 10)
    ax2.set_ylim(0, 10)
    ax2.axis('off')
    box2 = patches.Rectangle((0.5, 0.5), 9, 9, facecolor='#f0fdf4', edgecolor='#16a34a', linewidth=2)
    ax2.add_patch(box2)
    ax2.text(5, 8.5, "[AFTER REMEDIATION PROOF]", ha='center', fontsize=9.5, weight='bold', color='#16a34a')
    ax2.text(5, 5.0, "Remedy: High-Mast LED Lighting\n& Speed Breakers Installed\n\nPhoto: Bright Roadway\nWith Calming Markers", ha='center', va='center', fontsize=8.5, color='#1e293b')
    ax2.text(5, 1.5, "Geotag: 8.7139° N, 77.7567° E\nAccuracy: +/- 6.4m | Audit Status: VERIFIED", ha='center', fontsize=7.5, color='#64748b')

    save_fig(fig, "fig4_4_camera_proof_gps.png")

# ==========================================
# 15. Figure 5.1: DBSCAN Execution Performance
# ==========================================
def gen_fig5_1():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4.8))

    # Execution Time vs Points
    points = [50, 100, 250, 500, 1000]
    latencies = [0.35, 0.62, 1.25, 2.80, 5.95]

    ax1.plot(points, latencies, marker='o', color='#0284c7', linewidth=2)
    ax1.set_title("DBSCAN Execution Time vs. Incident Count", fontsize=9.5, weight='bold')
    ax1.set_xlabel("Number of Incident Points", fontsize=8.5, weight='bold')
    ax1.set_ylabel("Execution Time (ms)", fontsize=8.5, weight='bold')
    ax1.grid(True, linestyle='--', alpha=0.5)
    for x, y in zip(points, latencies):
        ax1.annotate(f"{y}ms", (x, y), textcoords="offset points", xytext=(0, 6), ha='center', fontsize=7.5, weight='bold')

    # Parameter Sensitivity (Epsilon vs Clusters)
    eps = ['300m', '450m', '800m', '1500m', '2500m', '5000m']
    clusters = [1, 1, 1, 2, 4, 6]
    noise = [52, 52, 52, 50, 41, 28]

    x_idx = np.arange(len(eps))
    w = 0.35
    ax2.bar(x_idx - w/2, clusters, w, label='Clusters Formed', color='#10b981')
    ax2.bar(x_idx + w/2, noise, w, label='Noise Points', color='#f59e0b')
    ax2.set_xticks(x_idx)
    ax2.set_xticklabels(eps, fontsize=8, weight='bold')
    ax2.set_title("DBSCAN Parameter Sensitivity (Epsilon)", fontsize=9.5, weight='bold')
    ax2.set_ylabel("Count", fontsize=8.5, weight='bold')
    ax2.legend(fontsize=8)
    ax2.grid(True, linestyle='--', alpha=0.4)

    save_fig(fig, "fig5_1_dbscan_performance.png")

# ==========================================
# 16. Figure 5.2: Environmental Cause Distribution
# ==========================================
def gen_fig5_2():
    fig, ax = plt.subplots(figsize=(8, 4.8))

    causes = ['Lighting Failure', 'High Vehicle Speed', 'Road Obstruction', 'Crossing Lack', 'Solid Waste']
    counts = [24, 18, 12, 9, 7]
    colors = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#10b981']

    bars = ax.bar(causes, counts, color=colors, width=0.55)
    ax.set_title("Environmental Contributing Cause Distribution (Pareto)", fontsize=10.5, weight='bold', pad=12)
    ax.set_ylabel("Incident Frequency Count", fontsize=8.5, weight='bold')
    ax.grid(True, linestyle='--', alpha=0.4, axis='y')

    for b in bars:
        h = b.get_height()
        ax.text(b.get_x() + b.get_width()/2, h + 0.5, str(h), ha='center', fontsize=8.5, weight='bold')

    plt.xticks(fontsize=8.5, weight='bold')
    save_fig(fig, "fig5_2_cause_distribution.png")

# ==========================================
# 17. Figure 5.3: AI Classification Confusion Matrix
# ==========================================
def gen_fig5_3():
    fig, ax = plt.subplots(figsize=(6.5, 5.5))
    
    # 250 test set: TP=144, FN=6, FP=4, TN=96
    matrix = np.array([
        [144,   6],
        [  4,  96]
    ])
    classes = ['Animal Present', 'Non-Animal / Reject']

    cax = ax.matshow(matrix, cmap=plt.cm.Blues)
    fig.colorbar(cax, fraction=0.046, pad=0.04)

    labels = [
        ["TP = 144\n(True Animal)", "FN = 6\n(Missed Animal)"],
        ["FP = 4\n(False Alarm)", "TN = 96\n(True Non-Animal)"]
    ]

    for i in range(2):
        for j in range(2):
            ax.text(j, i, labels[i][j], va='center', ha='center',
                    color="white" if matrix[i, j] > 50 else "black", fontsize=10, weight='bold')

    ax.set_xticks(range(2))
    ax.set_yticks(range(2))
    ax.set_xticklabels(classes, fontsize=9, weight='bold')
    ax.set_yticklabels(classes, fontsize=9, weight='bold')
    ax.set_xlabel('Predicted by MobileNetV2 Gatekeeper', fontsize=9.5, weight='bold', labelpad=10)
    ax.set_ylabel('Ground Truth Label', fontsize=9.5, weight='bold', labelpad=10)
    ax.set_title('Figure 5.3: AI Verification Confusion Matrix (n=250)\nAccuracy: 96.0% | Precision: 97.3% | Recall: 96.0%', fontsize=10, weight='bold', pad=15)

    save_fig(fig, "fig5_3_confusion_matrix.png")

# ==========================================
# 18. Figure 5.4: API Response-Time Comparison
# ==========================================
def gen_fig5_4():
    fig, ax = plt.subplots(figsize=(9, 4.8))

    endpoints = [
        '/drivers/nearby-hotspots',
        '/authority/cause-analysis',
        '/hotspots',
        '/rescue',
        '/authority/actions',
        '/admin/system-status',
        '/reports (POST)'
    ]
    latencies = [7.58, 8.95, 14.97, 14.70, 18.60, 42.95, 78.15]

    y_pos = np.arange(len(endpoints))
    bars = ax.barh(y_pos, latencies, color='#0284c7', height=0.55)
    ax.set_yticks(y_pos)
    ax.set_yticklabels(endpoints, fontsize=8.5, weight='bold')
    ax.invert_yaxis()  # Top-down
    ax.set_xlabel('Mean Latency (ms)', fontsize=8.5, weight='bold')
    ax.set_title('Figure 5.4: API Response-Time Comparison Across Subsystems', fontsize=10.5, weight='bold', pad=12)
    ax.grid(True, linestyle='--', alpha=0.4, axis='x')

    for b in bars:
        w = b.get_width()
        ax.text(w + 1.5, b.get_y() + b.get_height()/2, f"{w:.2f} ms", va='center', fontsize=8, weight='bold', color='#0f172a')

    save_fig(fig, "fig5_4_api_latency.png")

if __name__ == "__main__":
    print("Generating all 18 publication-quality diagrams...")
    gen_fig1_1()
    gen_fig2_1()
    gen_fig3_1()
    gen_fig3_2()
    gen_fig3_3()
    gen_fig3_4()
    gen_fig3_5()
    gen_fig3_6()
    gen_fig3_7()
    gen_fig3_8()
    gen_fig4_1()
    gen_fig4_2()
    gen_fig4_3()
    gen_fig4_4()
    gen_fig5_1()
    gen_fig5_2()
    gen_fig5_3()
    gen_fig5_4()
    print("All 18 figures generated successfully with pristine alignment!")
