# MoFA VibeME的需求和设计

## 需求：README.MD的伟大升级

做一个VibeMe网站，基本目的是代替一个MoFA GitHub Repo (https://github.com/mofa-org/mofa）里Readme.md的功能，把Repo以非常人性化的用户体验介绍给用户，并方便用户以Vibing的方式来使用和开发这个Repo。

我们要解决以下痛点问题：

1. 用户不知道怎么Vibing这个Repo (MoFA)。

2. 这个Repo (MoFA) 提供了哪些Vibing的工具

3. Vibe的Tool不容易被发现

4. Vibing的逻辑不容易懂

5. Vibing不容易上手

6. Vibing不容易管理，可能被覆盖，丢失

7. Vibing是一个Trial and Error的过程，要把好的Prompts从所有的实验中能够保留下来。

   

通过这个VibeMe，不但能使用户快速上手这个GitHub Repo，还能够把Vibing最佳实践传递给其他的不是很有经验的Viber，让他们能够根据这个实践进行一些改动，做成自己的软件。

更具体地说，通过Team Vibe，大家可以很容易地生成自己的mofa flows，并运行起来。

它就是readme的伟大升级，我们可以叫它Vibe Me。

## 设计：互动网站式、以方便新手Vibing为核心的人性化设计

1. 用户不知道怎么Vibing MoFA这个Repo，这需要VibeMe提供

   - Setup Vibing Environment：如何设置Claude或者Codex环境，从而可以方便地开始Vibing。

   1. Vibe Introduction：提供图文并茂的Repo的说明，并提供Vibe Analysis的对话框，和一系列样例问题，有助于用户通过Vibing （Ask questions to Claude Code or Codex)对Repo进行深入的了解。
   2. Vibe Installation: 如何通过Vibe的方式安装这个GitHub Repo，可编辑的示例。
   3. Vibe Run： 如何通过Vibe的方式运行这个GitHub Repo，可编辑的示例。
   4. Vibe Development：如何开发这个GitHub Repo，可编辑的示例。对于MoFA而言，包括但不限于
      - 如何Vibe 一个Node。
      - 如何运行一个Node。
      - 如何Vibe 一个Flow。
      - 如何运行一个 Flow。

2. Vibing的工具，比如已经写好了哪些基于Spec-Kit（https://github.com/github/spec-kit）的Spec driven Scripts，Claude Skills (https://code.claude.com/docs/en/skills) 等等，应该展示给大家，并给以示例。

3. Vibing的工具要非常清晰和简单地加以展示，包括，但不限于：
   - Skill：Skill Scirpt 的URL, Skill的使用说明，调用方式，可以用卡片的形式来说明。
   - Specifications
   - Constitutions
   - Plan.md等等。 
4. Vibing的逻辑应该用框图Flow的方式，展现在界面。

5. 界面要有示例并提供交互能力，让用户去更改示例里的Prompt，并完成Vibe。
6. 用户Vibing的记录应予以保存、管理、搜索和反复呈现。

从根本意义而言，VibeMe通过互动网站式的形式、方便不了解Repo，不善于Vibing的新手能比读ReadMe更丰富、深入和优雅的人性化体验，比直接用Vibe Code CLI更逻辑清晰、容易操控的方法，快速和深刻地了解和掌握MoFA Repo的使用和开发。

## 素材

MoFA repo 在：/Users/zonghuanwu/github/mofa

Spec-kit所在的位置在：  /Users/zonghuanwu/github/mofa/.specify

mofa的skill放在/Users/zonghuanwu/github/mofa/。claude/commands目录下

## 技术

用OpenAI Codex的支持下，实现1.1 Vibe Analysis。即在后台将界面上得到的Prompt交给OpenAI Codex来执行。