---
title: 模拟电路速查表：从 gm 到 ENOB
description: 一张用于复习和设计估算的速查表：MOS/BJT 小信号参数、单级增益、极点与建立时间、噪声、反馈、ADC 指标和设计检查项。
section: reference
tags: [速查, 公式, 设计估算]
date: 2026-10-25
author: 模拟电路学习站
aiAssisted: true
featured: true
order: 1
---

::: warning 使用前提
速查表适合**已经理解推导、需要快速回忆**的时候。所有公式都默认晶体管工作在饱和区/放大区，且满足小信号近似。真实设计请用 PDK 模型、SPICE 和实测数据校准，不要直接把理想公式当答案。
:::

## 物理常数与室温量

| 量 | 符号 | 室温附近的值 |
| --- | --- | --- |
| 玻尔兹曼常数 | $k$ | $1.381\times10^{-23}\,\mathrm{J/K}$ |
| 电子电荷 | $q$ | $1.602\times10^{-19}\,\mathrm{C}$ |
| 热电压（$T=300\,K$） | $V_T=kT/q$ | $\approx25.85\,\mathrm{mV}$ |
| 硅本征载流子浓度（300 K） | $n_i$ | $\approx1.0\times10^{10}\,\mathrm{cm^{-3}}$ |
| 热噪声系数 | $4kT$ | $\approx1.66\times10^{-20}\,\mathrm{J}$ |

::: tip 两个常用数量级
$1\,k\Omega$ 电阻的电压噪声密度约为 $4\,\mathrm{nV/\sqrt{Hz}}$。  
$1\,pF$ 电容在 $1\,k\Omega$ 上形成的极点约为 $159\,\mathrm{MHz}$。
:::

## MOS 管：大信号与小信号

### 饱和区平方律

$$
I_D=\frac{1}{2}\mu_n C_{ox}\frac{W}{L}\left(V_{GS}-V_{TH}\right)^2\left(1+\lambda V_{DS}\right)
$$

其中 $V_{ov}=V_{GS}-V_{TH}$ 是过驱动电压。忽略沟道长度调制时：

$$
I_D\approx\frac{1}{2}\mu_n C_{ox}\frac{W}{L}V_{ov}^2
$$

### 小信号参数

$$
g_m=\frac{\partial I_D}{\partial V_{GS}}
=\mu_n C_{ox}\frac{W}{L}V_{ov}
=\frac{2I_D}{V_{ov}}
=\sqrt{2\mu_n C_{ox}\frac{W}{L}I_D}
$$

$$
r_o\approx\frac{1}{\lambda I_D}=\frac{V_A}{I_D}
$$

$$
A_{0,\mathrm{intrinsic}}=g_m r_o\approx\frac{2V_A}{V_{ov}}
$$

| 如果你改变…… | $g_m$ | $r_o$ | $g_m r_o$ | 直觉 |
| --- | --- | --- | --- | --- |
| 保持 $V_{ov}$ 不变，$I_D$ 加倍 | 加倍 | 减半 | 不变 | 用更多电流换速度 |
| 保持 $I_D$ 不变，$V_{ov}$ 加倍 | 不变 | 不变 | 不变 | 同电流下改尺寸与偏置 |
| 保持 $W/L$ 不变，$I_D$ 加倍 | 约 $\sqrt{2}$ 倍 | 减半 | 约 $1/\sqrt{2}$ | 强反型近似 |
| 增加沟道长度 $L$ | 通常下降 | 增加 | 可能增加 | 用面积换本征增益 |

上表是强反型、平方律下的趋势。短沟道器件和弱反型区需要用 $g_m/I_D$ 曲线重新判断。

### 体效应与电容

- 体效应使阈值随 $V_{SB}$ 增加：$V_{TH}=V_{TH0}+\gamma(\sqrt{2\phi_F+V_{SB}}-\sqrt{2\phi_F})$。
- 栅源电容近似 $C_{gs}\approx\frac{2}{3}WLC_{ox}$（饱和区，忽略覆盖电容）。
- 栅漏电容 $C_{gd}$ 通过 Miller 效应放大输入电容：$C_{in}\approx C_{gs}+(1+|A_v|)C_{gd}$。

## BJT：快速对照

| 量 | 表达式 | 备注 |
| --- | --- | --- |
| 跨导 | $g_m=I_C/V_T$ | 与 $I_C$ 成正比，与器件尺寸无关 |
| 输入电阻 | $r_\pi=\beta/g_m$ | 小信号、正向放大区 |
| 输出电阻 | $r_o=V_A/I_C$ | 忽略 Early 效应时可视为无穷大 |
| 本征增益 | $g_m r_o=\beta V_A/V_T$ | 通常高于 MOS 单管 |

::: note 为什么 MOS 的 $g_m$ 更“贵”
BJT 的 $g_m$ 由 $I_C$ 唯一决定，而 MOS 的 $g_m$ 同时受 $I_D$ 和 $V_{ov}$ 控制。MOS 设计多了一个自由度：可以在相同电流下，用更大的 $W/L$ 换取更高的 $g_m$，代价是更大的电容和面积。这是 $g_m/I_D$ 设计方法的核心。
:::

## 单级增益与阻抗

| 结构 | 低频增益（忽略体效应） | 输入/输出阻抗 |
| --- | --- | --- |
| 共源，电阻负载 | $A_v\approx-g_m(R_D\parallel r_o)$ | $R_{in}\to\infty$，$R_{out}\approx R_D\parallel r_o$ |
| 共源，带源极退化 $R_S$ | $A_v\approx-\dfrac{g_m(R_D\parallel r_o)}{1+g_mR_S}$ | $R_{out}$ 提高约 $(1+g_mR_S)$ 倍 |
| 共栅 | $A_v\approx g_m(R_D\parallel r_o)$ | $R_{in}\approx1/g_m$，$R_{out}\approx R_D\parallel r_o$ |
| 源极跟随器 | $A_v\approx\dfrac{g_mR_L}{1+g_mR_L}$ | $R_{out}\approx1/g_m\parallel R_L$ |
| 共射 | $A_v\approx-g_m(R_C\parallel r_o)$ | $R_{in}\approx r_\pi$ |
| 差分对（单端输出） | $A_{dm}\approx-\frac{1}{2}g_m(R_D\parallel r_o)$ | 取决于尾电流与负载 |

::: warning 增益不是越高越好
提高增益通常意味着更大的 $r_o$、更长的 $L$ 或更小的电流，这些都会影响速度、摆幅和面积。设计时应该先确定**闭环需要的增益裕度**，再决定开环增益，而不是盲目追求单级高增益。
:::

## 频率响应与建立

### 主极点与带宽

$$
f_{p}=\frac{1}{2\pi R C}
\qquad\Longrightarrow\qquad
\omega_p=\frac{1}{RC}
$$

对于单极点系统，$-3\,\mathrm{dB}$ 带宽与上升时间近似满足：

$$
t_r\approx\frac{0.35}{f_{-3\mathrm{dB}}}
$$

单级 OTA 驱动负载电容 $C_L$ 时，单位增益频率近似：

$$
f_{u}\approx\frac{g_m}{2\pi C_L}
$$

### 建立时间

一阶系统的阶跃响应：

$$
y(t)=y_\infty\left(1-e^{-t/\tau}\right),\qquad \tau=RC
$$

达到相对误差 $\varepsilon$ 所需时间：

$$
t_{\mathrm{s}}=\tau\ln\left(\frac{1}{\varepsilon}\right)
$$

| 精度 | 所需时间 |
| --- | --- |
| 1% | $4.6\tau$ |
| 0.1% | $6.9\tau$ |
| 0.01% | $9.2\tau$ |
| $N$ 位 ADC 的 0.5 LSB | $\approx(N+1)\ln2\cdot\tau$ |

实际电路存在二阶或更高阶极点，可能出现振铃。此时建立时间由**相位裕度、非主极点和压摆率**共同决定，不能只用一阶公式。

### 压摆率

$$
\mathrm{SR}=\left.\frac{dv_{out}}{dt}\right|_{\max}\approx\frac{I_{\mathrm{tail}}}{C_L}
$$

全功率带宽：

$$
\mathrm{FPBW}\approx\frac{\mathrm{SR}}{2\pi V_{pk}}
$$

## 噪声

### 电阻热噪声

$$
e_{n,\mathrm{rms}}=\sqrt{4kTR\Delta f}
\qquad
i_{n,\mathrm{rms}}=\sqrt{\frac{4kT\Delta f}{R}}
$$

### 采样电容的 $kT/C$ 噪声

$$
v_{n,\mathrm{rms}}=\sqrt{\frac{kT}{C}}
$$

例如 $C=1\,pF$、$T=300\,K$ 时，$\sqrt{kT/C}\approx64\,\mu V_{\mathrm{rms}}$。

### 输入参考噪声

把各噪声源折算到输入端时，电压噪声直接相加（按功率），电流噪声乘以源阻抗：

$$
v_{n,\mathrm{in}}^2=e_{n}^2+\left(i_nR_s\right)^2+\frac{4kTR_s}{A_{\mathrm{sig}}}
$$

::: insight 噪声预算的顺序
先确定**信号源阻抗**和**系统带宽**，再决定输入参考噪声目标；不要先选一个低噪声运放，再发现源阻抗和带宽让它的优势消失了。噪声、带宽、功耗三者通常一起交换。
:::

## 反馈与稳定性

| 量 | 表达式 | 说明 |
| --- | --- | --- |
| 环路增益 | $T=A\beta$ | 决定精度、带宽与失真抑制 |
| 闭环增益 | $A_{cl}=\dfrac{A}{1+T}$ | 负反馈，$T\gg1$ 时约为 $1/\beta$ |
| 闭环带宽 | $f_{cl}\approx f_{u}\cdot\beta$ | 单极点近似 |
| 相位裕度 | $\mathrm{PM}=180^\circ+\angle T(j\omega_{u})$ | 工程上常以 $45^\circ$–$60^\circ$ 为起点 |

经验上，相位裕度越低，阶跃响应振铃越明显，建立越慢；但“PM 必须大于 60°”不是绝对定律，要结合工艺、负载和精度要求判断。

## ADC 与系统指标

### 理想量化

量化步长：

$$
q=\frac{V_{FS}}{2^N}
$$

量化噪声近似均匀分布时：

$$
v_{q,\mathrm{rms}}=\frac{q}{\sqrt{12}}
$$

理想满幅正弦输入的 SNR：

$$
\mathrm{SNR}_{\mathrm{ideal}}=6.02N+1.76\ \mathrm{dB}
$$

有效位数：

$$
\mathrm{ENOB}=\frac{\mathrm{SINAD}-1.76}{6.02}
$$

### 指标之间的关系

| 指标 | 含义 | 容易混淆的点 |
| --- | --- | --- |
| SNR | 信号与噪声（不含谐波）之比 | 不含谐波失真 |
| SINAD | 信号与噪声加谐波之比 | 决定 ENOB |
| SFDR | 信号与最大杂散之比 | 与信号幅度有关 |
| THD | 谐波总功率与信号功率之比 | 通常用 dB 或 % 表示 |
| ENOB | 等效理想位数 | 不是“实际分辨率” |

::: warning 采样与带宽
ADC 的输入带宽、采样保持带宽和抗混叠滤波器带宽不是同一个指标。只看采样率，无法判断一个 AFE 能否把带外噪声和干扰压到足够低。
:::

## 设计前最后检查的 10 件事

1. 每个晶体管的 $V_{DS}$、$V_{GS}$、$V_{SB}$ 是否在预期区域？
2. 输出摆幅是否覆盖后级输入范围，并留有 PVT 余量？
3. 主极点在哪里？非主极点是否足够远？
4. 相位裕度在最差负载和工艺角下是多少？
5. 压摆率是否支持最大的输入阶跃？
6. 输入共模范围是否覆盖信号源？
7. 噪声积分带宽是否与系统带宽一致？
8. 失调和 1/f 噪声是否会被系统架构消除？
9. 功耗预算是否包含偏置、输出驱动和泄漏？
10. 你的结论是否有一个独立的仿真或实测结果支持？
