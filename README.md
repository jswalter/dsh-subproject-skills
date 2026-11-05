# DSH 子项目技能插件

项目地址：[jswalter/dsh-subproject-skills](https://github.com/jswalter/dsh-subproject-skills)，版本 1.2.0。按 DSH 聊天工作目录加载一个多项目工作区内的直属子项目技能，防止兄弟项目的同名技能互相混入。

本仓库包含完整源码及安装器，不依赖其他仓库。包名为 `dsh-subproject-skills`；工作区由 `--workspace` 指定，可用于任意包含直属子项目的工作区。

## 安装与更新

需要已安装并至少启动过一次的 DSH Desktop。macOS 已使用过此插件；Windows 提供安装入口，尚未实机验证。安装前等待 DSH 任务结束并完全退出，完成后重新打开。

公开仓库下载无需 GitHub 账号。

```sh
git clone https://github.com/jswalter/dsh-subproject-skills.git
cd dsh-subproject-skills
sh install.command --workspace '/你的多项目工作区' --dry-run
sh install.command --workspace '/你的多项目工作区'
```

安装器调用 DSH 官方 CLI，将来源注册为 `git+https://github.com/jswalter/dsh-subproject-skills.git#main`，再写入本机工作区和 DSH 模块路径。已安装代码位于 DSH profile 内，不依赖下载目录；移动开发仓库不影响正常运行。已有 `workspaceRoot` 会保留，可用 `--workspace` 修改。首次安装必须指定绝对路径，不会从插件所在位置推断。

非默认应用位置设置 `DSH_APP_PATH='/实际位置/DeepSeek Harness.app'`；自定义配置目录传 `--home '/实际 DSH_HOME'`。`--dry-run` 只预览，`--local` 仅用于开发时切回本地链接。

更新时，退出 DSH 后执行：

```sh
git pull --ff-only
sh install.command --workspace '/你的多项目工作区'
```

也可从已安装包更新，不保留源码：

```sh
sh "${DSH_HOME:-$HOME/.dsh}/profiles/desktop/node_modules/dsh-subproject-skills/install.command" --workspace '/你的多项目工作区'
```

### Windows

在本仓库 PowerShell 中执行：

```powershell
.\install.ps1 -Workspace 'D:\Projects\Workspace' -AppPath 'C:\实际安装位置\DeepSeek Harness.exe' -DryRun
.\install.ps1 -Workspace 'D:\Projects\Workspace' -AppPath 'C:\实际安装位置\DeepSeek Harness.exe'
```

自定义配置目录传 `-DshHome`。安装器使用 DSH 自带 Electron，无需单独安装 Node；不需要修改系统执行策略。

## 行为与验收

根据 **DSH 聊天工作目录**选择配置工作区下的直属子项目，仅加载该子项目的 `.dsh/skills` 和 `.agents/skills`，前者优先。更深目录继承所属子项目；兄弟项目不会混入。原生提供方继续处理根目录和用户级技能。

打开工作区根目录、`tmp`、隐藏目录或工作区以外目录时，不添加技能。不读取 `.claude/skills`，不递归扫描全部子项目。终端中临时 `cd` 不改变聊天工作目录。原生 watcher 负责新增技能刷新，正文加载时重读。

用两个包含同名技能的子项目分别新建聊天，检查技能加载路径各自指向对应子项目；嵌套目录应沿用其直属子项目的技能。检查技能清单即可，无需发送聊天消息。

此前验证覆盖同名隔离、嵌套目录、公共技能、目录边界、符号链接别名、路径优先级及刷新。当前实现继续沿用上述隔离逻辑。

## 卸载与恢复

```sh
sh install.command --uninstall --dry-run
sh install.command --uninstall
```

Windows 使用 `.\install.ps1 -Uninstall -AppPath '实际应用路径'`。也可在 DSH 插件管理器卸载。命令行入口同时清理本插件托管配置；保留源码、技能及备份。备份位于 `$DSH_HOME/backups/local-bundle-skills-*/`，可能含个人配置，不提交 Git。

DSH preset 层的同名技能优先于 host 层，不应再把这些子项目技能复制到用户级目录。DSH 升级后若路径或提供方 API 变化，应重跑安装器并复测。
