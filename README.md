# TabRecorder

macOS の「iPhoneミラーリング / iPhone Mirroring」上で行ったクリック操作を記録し、後から CLI で再生する PoC です。

## 必要環境

- macOS
- Node.js 22+
- Swift 6+
- iPhone Mirroring が起動できる Mac

## インストール

```bash
npm install
npm run build:native
npm link
```

`npm link` 後は `tab-recorder` コマンドとして実行できます。リンクしない場合は次のように実行できます。

```bash
node --experimental-strip-types src/index.ts record example
```

## macOS 権限設定

Terminal や利用しているターミナルアプリに以下の権限を付与してください。

- System Settings -> Privacy & Security -> Accessibility
- System Settings -> Privacy & Security -> Input Monitoring

録画にはグローバルマウスイベント取得、再生にはマウスイベント生成が必要です。権限が不足している場合、helper がエラーを表示します。

## Record

```bash
tab-recorder record example
```

`iPhone Mirroring` ウインドウ内の左クリックだけを記録します。停止は `Ctrl+C` です。

保存先:

```text
scenarios/example.json
```

## Play

```bash
tab-recorder play scenarios/example.json
```

再生前に 3 秒のカウントダウンがあります。停止は `Ctrl+C` です。

## Loop / Count / Speed

```bash
tab-recorder play scenarios/example.json --loop
tab-recorder play scenarios/example.json --loop --loop-interval 3000
tab-recorder play scenarios/example.json --count 10
tab-recorder play scenarios/example.json --speed 2
```

`--loop-interval 3000` は各ループの間に3秒待機します。待機中も `Ctrl+C` ですぐに停止できます。単位はミリ秒で、デフォルトは `0` です。

`--speed 2` は待機時間を半分にします。

## Scenario JSON 仕様

```json
{
  "version": 1,
  "name": "example",
  "steps": [
    {
      "type": "tap",
      "x": 0.512,
      "y": 0.824,
      "delayAfter": 500
    },
    {
      "type": "repeatTap",
      "x": 0.512,
      "y": 0.824,
      "count": 50,
      "interval": 80,
      "delayAfter": 500
    },
    {
      "type": "wait",
      "duration": 1000
    }
  ]
}
```

- `x` / `y` は iPhone Mirroring ウインドウに対する相対座標で、範囲は `0` から `1` です。
- `delayAfter` はその操作後の待機時間です。
- `repeatTap` は同じ座標を `count` 回、`interval` ms 間隔でクリックします。

## 既知の制約

- 初期 PoC では iPhone 画面領域ではなく、iPhone Mirroring ウインドウ全体を基準に座標変換します。
- 録画結果の自動圧縮は未実装です。`repeatTap` は JSON を直接編集すれば再生できます。
- Screen Recording 権限は現時点では不要です。将来スクリーンショットや画像認識を追加する場合に必要になります。
