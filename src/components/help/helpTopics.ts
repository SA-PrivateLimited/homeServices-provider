export type HelpTopicId =
  | 'newRequests'
  | 'onlineReceive'
  | 'serviceOnOff'
  | 'myServices'
  | 'documents'
  | 'jobWorkflow'
  | 'customerContact'
  | 'loginOtp'
  | 'pin'
  | 'account'
  | 'feedback'
  | 'other';

export type HelpTopic = {
  id: HelpTopicId;
  icon: string;
  titleKey: string;
  bodyKey: string;
  listKey: string;
  tipsKey: string;
};

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'newRequests',
    icon: 'notifications',
    titleKey: 'help.topic.newRequestsTitle',
    bodyKey: 'help.topic.newRequestsBody',
    listKey: 'help.topic.newRequestsList',
    tipsKey: 'help.topic.newRequestsTips',
  },
  {
    id: 'onlineReceive',
    icon: 'toggle_on',
    titleKey: 'help.topic.onlineReceiveTitle',
    bodyKey: 'help.topic.onlineReceiveBody',
    listKey: 'help.topic.onlineReceiveList',
    tipsKey: 'help.topic.onlineReceiveTips',
  },
  {
    id: 'serviceOnOff',
    icon: 'handyman',
    titleKey: 'help.topic.serviceOnOffTitle',
    bodyKey: 'help.topic.serviceOnOffBody',
    listKey: 'help.topic.serviceOnOffList',
    tipsKey: 'help.topic.serviceOnOffTips',
  },
  {
    id: 'myServices',
    icon: 'list',
    titleKey: 'help.topic.myServicesTitle',
    bodyKey: 'help.topic.myServicesBody',
    listKey: 'help.topic.myServicesList',
    tipsKey: 'help.topic.myServicesTips',
  },
  {
    id: 'documents',
    icon: 'description',
    titleKey: 'help.topic.documentsTitle',
    bodyKey: 'help.topic.documentsBody',
    listKey: 'help.topic.documentsList',
    tipsKey: 'help.topic.documentsTips',
  },
  {
    id: 'jobWorkflow',
    icon: 'work',
    titleKey: 'help.topic.jobWorkflowTitle',
    bodyKey: 'help.topic.jobWorkflowBody',
    listKey: 'help.topic.jobWorkflowList',
    tipsKey: 'help.topic.jobWorkflowTips',
  },
  {
    id: 'customerContact',
    icon: 'call',
    titleKey: 'help.topic.customerContactTitle',
    bodyKey: 'help.topic.customerContactBody',
    listKey: 'help.topic.customerContactList',
    tipsKey: 'help.topic.customerContactTips',
  },
  {
    id: 'loginOtp',
    icon: 'lock',
    titleKey: 'help.topic.loginOtpTitle',
    bodyKey: 'help.topic.loginOtpBody',
    listKey: 'help.topic.loginOtpList',
    tipsKey: 'help.topic.loginOtpTips',
  },
  {
    id: 'pin',
    icon: 'password',
    titleKey: 'help.topic.pinTitle',
    bodyKey: 'help.topic.pinBody',
    listKey: 'help.topic.pinList',
    tipsKey: 'help.topic.pinTips',
  },
  {
    id: 'account',
    icon: 'person',
    titleKey: 'help.topic.accountTitle',
    bodyKey: 'help.topic.accountBody',
    listKey: 'help.topic.accountList',
    tipsKey: 'help.topic.accountTips',
  },
  {
    id: 'feedback',
    icon: 'rate_review',
    titleKey: 'help.topic.feedbackTitle',
    bodyKey: 'help.topic.feedbackBody',
    listKey: 'help.topic.feedbackList',
    tipsKey: 'help.topic.feedbackTips',
  },
  {
    id: 'other',
    icon: 'help',
    titleKey: 'help.topic.otherTitle',
    bodyKey: 'help.topic.otherBody',
    listKey: 'help.topic.otherList',
    tipsKey: 'help.topic.otherTips',
  },
];

export const HELP_GROUPS: {titleKey: string; ids: HelpTopicId[]}[] = [
  {titleKey: 'help.group.gettingStarted', ids: ['newRequests', 'onlineReceive']},
  {
    titleKey: 'help.group.services',
    ids: ['serviceOnOff', 'myServices', 'documents'],
  },
  {titleKey: 'help.group.jobs', ids: ['jobWorkflow', 'customerContact']},
  {titleKey: 'help.group.account', ids: ['loginOtp', 'pin', 'account']},
  {titleKey: 'help.group.more', ids: ['feedback', 'other']},
];
