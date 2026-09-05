import SignatureSetting from "./WebmailModules/SignatureSetting.jsx";
import CredentialsSetting from "./WebmailModules/CredentialsSetting.jsx";

/**
 * Registry central das abas de "Configurações" do Webmail.
 *
 * Para ADICIONAR uma nova aba:
 *   1. Crie um arquivo em ./modules/SuaConfig.jsx que exporte (default)
 *      um objeto: { id, label, icon, component }
 *      - id: string única (usada internamente para saber qual aba está ativa)
 *      - label: texto mostrado no menu lateral
 *      - icon: um ícone do react-icons/fa6 (ou outro)
 *      - component: o componente React que renderiza o conteúdo da aba.
 *        Ele deve ser autossuficiente: cuidar do próprio state, fetch e save.
 *   2. Importe o módulo aqui em cima e adicione ele no array abaixo.
 *
 * Para REMOVER uma aba: apague a linha correspondente do array (e o
 * import, se quiser). Não precisa mexer em nada dentro do Webmail.jsx.
 *
 * Para REORDENAR: mude a ordem dentro do array — a ordem do menu
 * lateral segue exatamente a ordem daqui.
 */
const mailSettings = [SignatureSetting, CredentialsSetting];

export default mailSettings;
