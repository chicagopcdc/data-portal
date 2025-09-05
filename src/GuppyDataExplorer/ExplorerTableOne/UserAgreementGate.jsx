import UserAgreement from '../ExplorerSurvivalAnalysis/UserAgreement';

export default function UserAgreementGate({ isCompliant, onAgree, children }) {
  return isCompliant ? children : <UserAgreement onAgree={onAgree} />;
}