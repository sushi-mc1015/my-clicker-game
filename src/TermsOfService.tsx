import React from 'react';
import './TermsOfService.css';

interface TermsOfServiceProps {
  onClose: () => void;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({ onClose }) => {
  return (
    <div className="terms-overlay">
      <div className="terms-container">
        <div className="terms-header">
          <h1>利用規約</h1>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="terms-content">
          <section>
            <h2>1. サービスについて</h2>
            <p>
              このストレス発散ゲーム（以下「本サービス」）は、ユーザーがストレスを解消するためのクリックゲームです。
              パンチまたは銃で画像をクリックしてスコアを競う機能を提供しています。
            </p>
          </section>

          <section>
            <h2>2. ユーザーアカウント</h2>
            <p>
              本サービスを利用するには、Google アカウントでログインする必要があります。
              ユーザーは自分のアカウント情報を適切に管理し、第三者による不正使用を防ぐ責任があります。
            </p>
          </section>

          <section>
            <h2>3. データ保護とプライバシー</h2>
            <p>
              ユーザーのスコアやニックネーム、アップロードされた画像は Firebase のデータベースに保存されます。
              当サービスでは、ユーザーのプライバシーを尊重し、個人情報を慎重に取り扱います。
              詳細はプライバシーポリシーをご参照ください。
            </p>
          </section>

          <section>
            <h2>4. ユーザーコンテンツ</h2>
            <p>
              ユーザーがアップロードした画像や設定した音声ファイルは、ユーザー自身が著作権を有していることを確認するものとします。
              当サービスは、ユーザーがアップロードしたコンテンツに関する責任を負いません。
            </p>
          </section>

          <section>
            <h2>5. 禁止事項</h2>
            <ul>
              <li>本サービスの不正使用または悪用</li>
              <li>他のユーザーへの嫌がらせ</li>
              <li>違法または不適切なコンテンツのアップロード</li>
              <li>本サービスのセキュリティを危険にさらす行為</li>
              <li>自動ツールやボットによる不正なアクセス</li>
            </ul>
          </section>

          <section>
            <h2>6. サービスの変更と中止</h2>
            <p>
              当サービスは、予告なく機能の追加、変更、または中止することがあります。
              ユーザーの利用権に関して、当サービスは一切の責任を負いません。
            </p>
          </section>

          <section>
            <h2>7. 免責事項</h2>
            <p>
              本サービスは「現状のまま」提供されるものであり、明示または暗示の保証はありません。
              当サービスの利用により生じた損害について、当サービスは一切の責任を負いません。
            </p>
          </section>

          <section>
            <h2>8. 規約の変更</h2>
            <p>
              当サービスは、いつでも本規約を変更することができます。
              変更は当ページに掲載され、変更後の利用は新しい規約に同意したものとみなされます。
            </p>
          </section>

          <section>
            <h2>9. お問い合わせ</h2>
            <p>
              本規約についてご不明な点があれば、当サービスまでお問い合わせください。
            </p>
          </section>
        </div>

        <div className="terms-footer">
          <button className="agree-button" onClick={onClose}>
            同意して閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
